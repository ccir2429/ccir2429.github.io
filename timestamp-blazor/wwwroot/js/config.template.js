// Șablon de configurare. Valorile ${...} sunt completate la publicare din GitHub Secrets
// (vezi .github/workflows/deploy.yml). NU pune chei reale în acest fișier.
window.CFG = {
    // Adresa Realtime Database (fără / la final).
    dbUrl: "https://live-chapters-default-rtdb.europe-west1.firebasedatabase.app",
    // Secret GitHub: FIREBASE_API_KEY
    apiKey: "${FIREBASE_API_KEY}",
    // Secret GitHub: ADMIN_EMAIL (utilizatorul din Firebase Authentication)
    adminEmail: "${ADMIN_EMAIL}",
    // ID-ul canalului @bisericaalbini
    channelId: "UC0EZ-q-MQvNoMA8S-PkqExw",
    // true = chat între tine și vizualizatori; false = chat ascuns (alerta rămâne activă)
    chatEnabled: true
};
