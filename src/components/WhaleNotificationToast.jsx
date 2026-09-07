import React, { useState, useEffect } from 'react'
import { fomoEngine } from '../core/FOMOEngine.js'

export default function WhaleNotificationToast() {
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    const unsubscribe = fomoEngine.subscribe(notif => {
      setNotification(notif)
    })
    return () => unsubscribe()
  }, [])

  if (!notification) return null

  return (
    <div className="whale-toast animate-slide-down">
      <div className="whale-toast-badge">{notification.badge}</div>
      <div className="whale-toast-text">{notification.text}</div>
      <div className="whale-toast-pulse"></div>
    </div>
  )
}
