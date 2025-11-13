# Ghost Tunnel v2.0

![Status](https://img.shields.io/badge/Status-Operational-success?style=flat-square&color=00ff88)
![Security](https://img.shields.io/badge/Encryption-AES--GCM_256-blue?style=flat-square&color=66fcf1)
![Dependencies](https://img.shields.io/badge/Dependencies-PeerJS_Only-lightgrey?style=flat-square)
![Bloat](https://img.shields.io/badge/Bloat-0%25-red?style=flat-square)

> **"Silence is security."**

**Ghost Tunnel** ist eine serverlose, flüchtige P2P-Messaging-Plattform. Sie wurde entwickelt, um absolute Kommunikationshoheit zurückzugewinnen. Keine Datenbanken, keine Logs, keine unnötige Komplexität. Gehostet im Browser, ausgeführt via WebRTC.

---

## 🖥️ Interface
*(Hier einen Screenshot der App einfügen, z.B. `docs/screenshot.png`)*


Das Design folgt dem **"Phantom-UI"** Prinzip:
* **Ablenkungsfrei:** Nur Chat und Status.
* **Dark Mode Native:** Augenfreundlich und energiesparend (OLED-Optimiert).
* **Responsive:** Funktioniert auf Desktop und Mobile gleichermaßen.

---

## 🛡️ Technische Architektur

Ghost Tunnel verzichtet bewusst auf moderne Frontend-Frameworks (React, Vue, Angular), um die Angriffsfläche zu minimieren ("Supply Chain Attacks") und den Code auditierbar zu halten.

### Der Stack
* **Core:** Vanilla ES6 JavaScript (Modular MVC Pattern).
* **Transport:** WebRTC (via PeerJS Signaling).
* **Styling:** Pure CSS3 (Variables & Flexbox).
* **Persistence:** **Zero.** Ein Page-Refresh vernichtet die Sitzung unwiderruflich.

### Sicherheitsprotokoll (Target Architecture)
Das System nutzt ein **Dual-Layer Encryption** Verfahren:
1.  **Transport Layer:** Standard WebRTC DTLS/SRTP (Verschlüsselung der Leitung).
2.  **Application Layer:** Client-seitige E2EE vor dem Netzwerk-Stack.
    * **Key Exchange:** ECDH (Elliptic Curve Diffie-Hellman) P-256.
    * **Cipher:** AES-GCM (256 bit).

---

## 🚀 Bedienung

### 1. Initialisierung
Öffne die App. Das System verbindet sich automatisch mit dem Signaling-Schwarm.
Sobald oben rechts deine **ID** erscheint (z.B. `7f9a2...`), ist der Tunnel bereit.

### 2. Verbindung herstellen
* **Als Host:** Klicke auf deine ID, um sie zu kopieren. Sende sie deinem Partner (via Signal, Threema, etc.).
* **Als Gast:** Füge die ID des Partners in das untere Textfeld ein und drücke `Enter`.

### 3. Kommunikation
Sobald die Status-LED auf **Grün** springt, ist der Tunnel etabliert. Das Eingabefeld wechselt nun automatisch in den Chat-Modus.

---

## 🕵️ The Hidden Layer (Diagnose)

Ghost Tunnel enthält ein verstecktes Telemetrie-Modul zur Überwachung der Verbindungsqualität und Sicherheitsparameter.

* **Trigger:** Gib im Chat den Befehl `!systemstatus` ein.
* **Daten:**
    * **RTT (Round Trip Time):** Echte Latenz in Millisekunden.
    * **ICE State:** Verbindungsstatus (Checking, Connected, Disconnected).
    * **Candidate Type:** Verbindungstyp (Host/LAN oder SRFLX/STUN).

---

## 🛠️ Installation (Local Dev)

Für Entwickler, die den Code auditieren oder erweitern wollen.

```bash
# 1. Clone Repository
git clone [https://github.com/nullkommaneun/Ghost-Tunnel.git](https://github.com/nullkommaneun/Ghost-Tunnel.git)

# 2. Navigate to folder
cd Ghost-Tunnel

# 3. Start Local Server (Mandatory for ES6 Modules)
# Falls Python installiert ist:
python3 -m http.server 8080
# Alternativ mit Node.js:
npx http-server .
