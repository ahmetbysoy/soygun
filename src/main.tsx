import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// StrictMode dev'de effect'leri çift çalıştırır -> oyun döngüsü ve ticker tek effect ile çalışır
createRoot(document.getElementById('root')!).render(<App />)

