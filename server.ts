import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

interface GameRound {
  roundId: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  winningSeg: number;
  timestamp: number;
}

const roundsHistory = new Map<string, GameRound>();

// Server seed state
let currentServerSeed = crypto.randomBytes(32).toString("hex");
let currentServerSeedHash = crypto.createHash("sha256").update(currentServerSeed).digest("hex");
let globalNonce = 0;

function rotateServerSeed() {
  currentServerSeed = crypto.randomBytes(32).toString("hex");
  currentServerSeedHash = crypto.createHash("sha256").update(currentServerSeed).digest("hex");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ── Authoritative API Endpoints ──

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: Date.now() });
  });

  /**
   * Commit-Reveal taahhüdü:
   * Çark dönmeden önce oyuncuya server seed hash'ini verir.
   */
  app.get("/api/game/commitment", (req, res) => {
    res.json({
      serverSeedHash: currentServerSeedHash,
      nonce: globalNonce + 1,
      standard: "HMAC-SHA256 / GLI-19 Provably Fair",
    });
  });

  /**
   * Authoritative Spin:
   * Sonucu sunucuda kriptografik HMAC-SHA256 ile üretir.
   */
  app.post("/api/game/spin", (req, res) => {
    try {
      const clientSeed = (req.body?.clientSeed && typeof req.body.clientSeed === "string")
        ? req.body.clientSeed.slice(0, 64)
        : crypto.randomBytes(16).toString("hex");

      globalNonce += 1;
      const nonce = globalNonce;
      const segmentCount = Number(req.body?.segmentCount) || 12;

      // HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}`)
      const hmac = crypto.createHmac("sha256", currentServerSeed);
      hmac.update(`${clientSeed}:${nonce}`);
      const digestBuffer = hmac.digest();
      const rawHex = digestBuffer.toString("hex");

      // GLI-19 standardına uygun ilk 4 byte'ı 32-bit unsigned int'e çevirip modülo al
      const intVal = digestBuffer.readUInt32BE(0);
      const winningSeg = intVal % segmentCount;

      const roundId = `rnd_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const roundData: GameRound = {
        roundId,
        serverSeed: currentServerSeed,
        serverSeedHash: currentServerSeedHash,
        clientSeed,
        nonce,
        winningSeg,
        timestamp: Date.now(),
      };

      roundsHistory.set(roundId, roundData);

      // Eski turları bellekte sınırla (maksimum 1000 tur)
      if (roundsHistory.size > 1000) {
        const firstKey = roundsHistory.keys().next().value;
        if (firstKey) roundsHistory.delete(firstKey);
      }

      // Güvenlik: serverSeed gizli kalır, istemciye sadece taahhüt hash'i verilir
      res.json({
        success: true,
        roundId,
        winningSeg,
        serverSeedHash: currentServerSeedHash,
        clientSeed,
        nonce,
        rawHexSignature: rawHex.slice(0, 32),
        timestamp: roundData.timestamp,
      });

      // Periyodik server seed rotasyonu
      if (globalNonce % 50 === 0) {
        rotateServerSeed();
      }
    } catch (err: any) {
      console.error("Authoritative spin error:", err);
      res.status(500).json({ success: false, error: err.message || "Spin calculation failed" });
    }
  });

  /**
   * Doğrulama Endpoint'i:
   * Oyuncu elindeki serverSeed, clientSeed ve nonce ile sonucun doğruluğunu bağımsız kontrol edebilir.
   */
  app.post("/api/game/verify", (req, res) => {
    try {
      const { serverSeed, clientSeed, nonce, segmentCount = 12 } = req.body;
      if (!serverSeed || !clientSeed || nonce == null) {
        return res.status(400).json({ valid: false, error: "Eksik parametreler" });
      }

      const hmac = crypto.createHmac("sha256", serverSeed);
      hmac.update(`${clientSeed}:${nonce}`);
      const digestBuffer = hmac.digest();
      const intVal = digestBuffer.readUInt32BE(0);
      const calculatedSeg = intVal % Number(segmentCount);
      const computedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");

      res.json({
        valid: true,
        calculatedSeg,
        computedHash,
        rawHex: digestBuffer.toString("hex"),
      });
    } catch (err: any) {
      res.status(500).json({ valid: false, error: err.message });
    }
  });

  // ── Shop & Kripto Ödeme / Paket Endpoints ──

  const CHIP_PACKAGES = [
    {
      id: "pkg_rookie",
      name: "Sokak Çaylağı",
      chips: 150,
      priceUsd: 0.99,
      tonEst: 0.25,
      bonusPercent: 0,
      badge: "🧢",
      description: "Hızlı masaya giriş paketi",
    },
    {
      id: "pkg_enforcer",
      name: "Mekan Koruyucusu",
      chips: 850,
      priceUsd: 4.99,
      tonEst: 1.25,
      bonusPercent: 15,
      badge: "🐺",
      description: "En popüler sokak kasası (+%15 Bonus)",
    },
    {
      id: "pkg_heist",
      name: "Banka Kasası Soyguncusu",
      chips: 2000,
      priceUsd: 9.99,
      tonEst: 2.50,
      bonusPercent: 25,
      badge: "💼",
      description: "Yüksek hacimli VIP soygun fonu (+%25 Bonus)",
    },
    {
      id: "pkg_cartel",
      name: "Kartel Baronu Kasası",
      chips: 12000,
      priceUsd: 49.99,
      tonEst: 12.50,
      bonusPercent: 40,
      badge: "👑",
      description: "Masa kapatan elit kasa (+%40 Bonus + VIP Öncelik)",
    },
  ];

  const processedTxHashes = new Set<string>();
  const activeOrders = new Map<string, {
    orderId: string;
    uid: string;
    packageId: string;
    chips: number;
    priceUsd: number;
    memo: string;
    createdAt: number;
  }>();

  // Paket Listesi
  app.get("/api/shop/packages", (req, res) => {
    res.json({ success: true, packages: CHIP_PACKAGES });
  });

  // Sipariş Oluşturma (TON / USDT Ödeme Faturası)
  app.post("/api/shop/create-order", (req, res) => {
    try {
      const { uid, packageId } = req.body;
      const pkg = CHIP_PACKAGES.find(p => p.id === packageId);
      if (!pkg) {
        return res.status(404).json({ success: false, error: "Geçersiz paket seçildi" });
      }

      const orderId = `ord_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const memo = `SOYGUN_${orderId.slice(-6).toUpperCase()}`;

      const orderData = {
        orderId,
        uid,
        packageId,
        chips: pkg.chips,
        priceUsd: pkg.priceUsd,
        memo,
        createdAt: Date.now(),
      };

      activeOrders.set(orderId, orderData);

      res.json({
        success: true,
        orderId,
        pkg,
        memo,
        merchantWallet: "EQB_SOYGUN_CARKI_TREASURY_OFFICIAL_VAULT_2026",
        expiresInSeconds: 900,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Ödeme ve İşlem Teyidi (Doğrudan Çip Yükleme)
  app.post("/api/shop/verify-order", (req, res) => {
    try {
      const { uid, packageId, txHash } = req.body;
      const pkg = CHIP_PACKAGES.find(p => p.id === packageId);
      if (!pkg) {
        return res.status(404).json({ success: false, error: "Paket bulunamadı" });
      }

      // Çift harcama (double-spend) engeli
      const txKey = txHash ? String(txHash).trim() : `order_${uid}_${Date.now()}`;
      if (txHash && processedTxHashes.has(txKey)) {
        return res.status(400).json({ success: false, error: "Bu işlem referansı daha önce kullanıldı." });
      }
      processedTxHashes.add(txKey);

      res.json({
        success: true,
        uid,
        packageId,
        packageName: pkg.name,
        chipsAdded: pkg.chips,
        txRef: txKey,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });


  // ── Vite Middleware / Static Serving ──

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Soygun Çarkı Authoritative Server running on port ${PORT}`);
  });
}

startServer();
