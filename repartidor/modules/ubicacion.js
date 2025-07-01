// src/gps/ubicacion.js

import { db } from "../firebase/init.js";

export function iniciarRastreoGPS(uidRepartidor) {
  if (!navigator.geolocation) {
    console.warn("Geolocalización no soportada.");
    return;
  }

  navigator.geolocation.watchPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      db.collection("repartidores").doc(uidRepartidor).update({
        ubicacionActual: { lat: latitude, lng: longitude },
        timestamp: new Date()
      });
    },
    err => console.error("Error de GPS:", err),
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
  );
}
