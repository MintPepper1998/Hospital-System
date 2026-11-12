/*
 * =====================================================================================
 *  Shree Kamal Hospital Management System
 *  ESP32 RFID Attendance Device (RC522 + 16x2 I2C LCD + Buzzer)
 * =====================================================================================
 *
 *  Hardware Components:
 *    1. ESP32 DevKit (30-pin or 38-pin ESP-WROOM-32)
 *    2. RC522 (MFRC522) RFID Reader/Writer (13.56 MHz, SPI)
 *    3. 16x2 Character LCD with I2C Backpack (PCF8574, 4-pin: GND, VCC, SDA, SCL)
 *    4. 5V/3.3V Active Buzzer (or 3-pin Buzzer Module)
 *    5. 830-Point Solderless Breadboard & Jumper Wires
 *
 *  Wiring Connections:
 *  ─────────────────────────────────────────────────────────────────────────
 *  MODULE        MODULE PIN    ESP32 PIN    NOTES
 *  ─────────────────────────────────────────────────────────────────────────
 *  RC522 RFID    3.3V          3V3          ⚠️ CRITICAL: 3.3V ONLY (NOT 5V!)
 *                RST           GPIO 4       Reset pin
 *                GND           GND          Ground rail
 *                IRQ           NC           Not connected (leave open)
 *                MISO          GPIO 19      VSPI MISO
 *                MOSI          GPIO 23      VSPI MOSI
 *                SCK           GPIO 18      VSPI SCK
 *                SDA (SS/CS)   GPIO 5       VSPI Chip Select
 *  ─────────────────────────────────────────────────────────────────────────
 *  16x2 I2C LCD  GND           GND          Ground rail
 *                VCC           VIN (5V)     ⚠️ 5V from USB pin (needed for contrast!)
 *                SDA           GPIO 21      Default ESP32 I2C SDA
 *                SCL           GPIO 22      Default ESP32 I2C SCL
 *  ─────────────────────────────────────────────────────────────────────────
 *  Active Buzzer + (Long pin)  GPIO 13      Buzzer signal
 *                - (Short pin) GND          Ground rail
 *  ─────────────────────────────────────────────────────────────────────────
 *
 *  Required Arduino IDE Libraries (Tools -> Manage Libraries...):
 *    1. "MFRC522" by GithubCommunity (v1.4.10+)
 *    2. "LiquidCrystal_I2C" by Frank de Brabander or Marco Schwartz (v1.1.2+)
 *    3. "ArduinoJson" by Benoit Blanchon (v7.x or v6.x)
 *
 *  Arduino IDE Board Settings:
 *    Board: "DOIT ESP32 DEVKIT V1" (or "ESP32 Dev Module")
 *    Upload Speed: 115200 (or 921600)
 *    CPU Frequency: 240MHz (WiFi/BT)
 *    Flash Frequency: 80MHz
 * =====================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// ═════════════════════════════════════════════════════════════════════
// 1. NETWORK & ERP CONFIGURATION — Update with your network credentials
// ═════════════════════════════════════════════════════════════════════
const char* WIFI_SSID     = "YOUR_WIFI_SSID";         // Hospital Wi-Fi SSID
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";     // Hospital Wi-Fi Password

// ERP Server Base URL (e.g. "http://192.168.1.100:3000" or cloud domain "https://your-hospital.com")
const char* ERP_BASE_URL  = "http://192.168.1.100:3000";

// API Secret Key — must match RFID_API_KEY in ERP's .env file
const char* API_KEY       = "rfid-attendance-secret-key";

// Unique identifier for this physical attendance station
const char* DEVICE_ID     = "ENTRANCE-1";

// ═════════════════════════════════════════════════════════════════════
// 2. HARDWARE PIN DEFINITIONS FOR ESP32
// ═════════════════════════════════════════════════════════════════════
// RC522 (VSPI)
#define RFID_SS_PIN       5    // Chip Select
#define RFID_RST_PIN      4    // Reset Pin
// Note: Hardware VSPI default pins: SCK=18, MISO=19, MOSI=23

// 16x2 LCD (I2C)
// Note: Default Hardware I2C pins: SDA=21, SCL=22
#define LCD_I2C_ADDR      0x27 // Usually 0x27 or 0x3F

// Active Buzzer & Onboard Indicator
#define BUZZER_PIN        13
#define LED_INDICATOR_PIN 2    // Onboard blue LED on most ESP32 boards

// ═════════════════════════════════════════════════════════════════════
// 3. OPERATIONAL TIMING & QUEUE LIMITS
// ═════════════════════════════════════════════════════════════════════
#define SCAN_COOLDOWN_MS    3000   // Prevent double-scanning same card within 3 sec
#define DISPLAY_RESET_MS    3500   // Time result message stays on LCD before returning to idle
#define HEARTBEAT_INTERVAL  60000  // Send heartbeat ping every 60 seconds
#define HTTP_TIMEOUT_MS     5000   // 5 seconds timeout for API responses
#define OFFLINE_QUEUE_SIZE  60     // Store up to 60 scans if WiFi/server drops

// ═════════════════════════════════════════════════════════════════════
// 4. CUSTOM LCD ICONS (5x8 Pixel Matrices)
// ═════════════════════════════════════════════════════════════════════
// Checkmark ✓
byte iconCheck[8] = {
  0b00000,
  0b00001,
  0b00010,
  0b10100,
  0b01000,
  0b00000,
  0b00000,
  0b00000
};

// Cross / Error ✗
byte iconCross[8] = {
  0b00000,
  0b10001,
  0b01010,
  0b00100,
  0b01010,
  0b10001,
  0b00000,
  0b00000
};

// RFID Card 💳
byte iconCard[8] = {
  0b11111,
  0b10001,
  0b10001,
  0b11111,
  0b10001,
  0b10001,
  0b11111,
  0b00000
};

// WiFi Signal 📶
byte iconWifi[8] = {
  0b00000,
  0b01110,
  0b10001,
  0b00100,
  0b01010,
  0b00000,
  0b00100,
  0b00000
};

// ═════════════════════════════════════════════════════════════════════
// 5. GLOBAL OBJECTS & STATE
// ═════════════════════════════════════════════════════════════════════
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, 16, 2);

String lastScannedUID = "";
unsigned long lastScanTimestamp = 0;
unsigned long lastHeartbeatTimestamp = 0;
unsigned long displayMessageTimestamp = 0;
bool isShowingMessage = false;

struct OfflineScanRecord {
  String uid;
  unsigned long timestamp;
};
OfflineScanRecord offlineQueue[OFFLINE_QUEUE_SIZE];
int offlineCount = 0;

// ═════════════════════════════════════════════════════════════════════
// 6. BUZZER SOUND PATTERNS
// ═════════════════════════════════════════════════════════════════════
void beepClick() {
  digitalWrite(BUZZER_PIN, HIGH);
  digitalWrite(LED_INDICATOR_PIN, HIGH);
  delay(40);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_INDICATOR_PIN, LOW);
}

void beepSuccessCheckin() {
  // Upbeat two-tone beep (Cheery confirmation)
  digitalWrite(BUZZER_PIN, HIGH);
  digitalWrite(LED_INDICATOR_PIN, HIGH);
  delay(80);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_INDICATOR_PIN, LOW);
  delay(60);
  digitalWrite(BUZZER_PIN, HIGH);
  digitalWrite(LED_INDICATOR_PIN, HIGH);
  delay(120);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_INDICATOR_PIN, LOW);
}

void beepSuccessCheckout() {
  // Long solid confirmation beep
  digitalWrite(BUZZER_PIN, HIGH);
  digitalWrite(LED_INDICATOR_PIN, HIGH);
  delay(180);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_INDICATOR_PIN, LOW);
}

void beepError() {
  // 3 rapid warning buzzes
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_INDICATOR_PIN, HIGH);
    delay(90);
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(LED_INDICATOR_PIN, LOW);
    delay(70);
  }
}

void beepWarningOffline() {
  // Low double-pulse
  digitalWrite(BUZZER_PIN, HIGH);
  delay(50);
  digitalWrite(BUZZER_PIN, LOW);
  delay(50);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(50);
  digitalWrite(BUZZER_PIN, LOW);
}

// ═════════════════════════════════════════════════════════════════════
// 7. LCD DISPLAY HELPERS
// ═════════════════════════════════════════════════════════════════════
void lcdCenterText(int row, String text) {
  int len = text.length();
  int col = (16 - len) / 2;
  if (col < 0) col = 0;
  lcd.setCursor(col, row);
  lcd.print(text.substring(0, 16));
}

void showIdleScreen() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SHREE KAMAL HOSP");
  lcd.setCursor(0, 1);
  lcd.write(3); // Card icon
  lcd.print(" TAP CARD HERE ");
  isShowingMessage = false;
}

void showCheckinScreen(String staffName, String employeeId) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.write(1); // Checkmark ✓
  lcd.print(" IN: ");
  lcd.print(staffName.substring(0, 11));

  lcd.setCursor(0, 1);
  lcd.print("ID: " + employeeId + "  OK");
  isShowingMessage = true;
  displayMessageTimestamp = millis();
}

void showCheckoutScreen(String staffName, String employeeId) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.write(1); // Checkmark ✓
  lcd.print(" OUT: ");
  lcd.print(staffName.substring(0, 10));

  lcd.setCursor(0, 1);
  lcd.print("ID: " + employeeId + " BYE!");
  isShowingMessage = true;
  displayMessageTimestamp = millis();
}

void showUnknownCardScreen(String uid) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.write(2); // Cross mark ✗
  lcd.print(" UNKNOWN CARD!");

  lcd.setCursor(0, 1);
  lcd.print(uid.substring(0, 16));
  isShowingMessage = true;
  displayMessageTimestamp = millis();
}

void showAlreadyCompleteScreen(String staffName) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(staffName.substring(0, 16));

  lcd.setCursor(0, 1);
  lcd.print("ALREADY RECORDED");
  isShowingMessage = true;
  displayMessageTimestamp = millis();
}

void showOfflineStoredScreen(int count) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SAVED OFFLINE");

  lcd.setCursor(0, 1);
  lcd.print("Queue: " + String(count) + "/" + String(OFFLINE_QUEUE_SIZE));
  isShowingMessage = true;
  displayMessageTimestamp = millis();
}

// ═════════════════════════════════════════════════════════════════════
// 8. WIFI CONNECTION & MANAGEMENT
// ═════════════════════════════════════════════════════════════════════
void connectWiFi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);

  lcd.clear();
  lcdCenterText(0, "Connecting WiFi");
  lcdCenterText(1, String(WIFI_SSID).substring(0, 16));

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());

    lcd.clear();
    lcdCenterText(0, "WiFi Connected!");
    lcdCenterText(1, WiFi.localIP().toString());
    delay(1500);
  } else {
    Serial.println("\n[WiFi] Connection failed. Operating in offline mode.");
    lcd.clear();
    lcdCenterText(0, "WiFi Failed!");
    lcdCenterText(1, "Offline Mode");
    delay(1500);
  }
}

// ═════════════════════════════════════════════════════════════════════
// 9. API REQUESTS: CHECK-IN & HEARTBEAT
// ═════════════════════════════════════════════════════════════════════
void sendCheckinRequest(String uid) {
  if (WiFi.status() != WL_CONNECTED) {
    // Save to offline buffer
    if (offlineCount < OFFLINE_QUEUE_SIZE) {
      offlineQueue[offlineCount].uid = uid;
      offlineQueue[offlineCount].timestamp = millis();
      offlineCount++;
      showOfflineStoredScreen(offlineCount);
      beepWarningOffline();
    } else {
      lcd.clear();
      lcdCenterText(0, "Offline Queue");
      lcdCenterText(1, "Buffer Full!");
      beepError();
    }
    return;
  }

  HTTPClient http;
  String endpoint = String(ERP_BASE_URL) + "/api/attendance/rfid-checkin";
  http.begin(endpoint);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);

  JsonDocument requestDoc;
  requestDoc["rfidTag"] = uid;
  requestDoc["deviceId"] = DEVICE_ID;
  String requestBody;
  serializeJson(requestDoc, requestBody);

  Serial.println("[HTTP] POST " + endpoint);
  Serial.println("[HTTP] Payload: " + requestBody);

  int httpCode = http.POST(requestBody);

  if (httpCode > 0) {
    String responseString = http.getString();
    Serial.print("[HTTP] Response (Code ");
    Serial.print(httpCode);
    Serial.println("): " + responseString);

    JsonDocument responseDoc;
    DeserializationError jsonError = deserializeJson(responseDoc, responseString);

    if (!jsonError && responseDoc["success"].as<bool>()) {
      String staffName = responseDoc["staffName"].as<String>();
      String employeeId = responseDoc["employeeId"].as<String>();
      String action = responseDoc["action"].as<String>();

      if (action == "CHECK_IN") {
        showCheckinScreen(staffName, employeeId);
        beepSuccessCheckin();
      } else {
        showCheckoutScreen(staffName, employeeId);
        beepSuccessCheckout();
      }
    } else {
      String errorCode = responseDoc["error"].as<String>();
      Serial.println("[RFID] Server Error: " + errorCode);

      if (errorCode == "UNKNOWN_CARD") {
        showUnknownCardScreen(uid);
        beepError();
      } else if (errorCode == "ALREADY_COMPLETE") {
        String staffName = responseDoc["staffName"].as<String>();
        showAlreadyCompleteScreen(staffName);
        beepError();
      } else {
        lcd.clear();
        lcdCenterText(0, "Error:");
        lcdCenterText(1, errorCode.substring(0, 16));
        beepError();
        isShowingMessage = true;
        displayMessageTimestamp = millis();
      }
    }
  } else {
    Serial.print("[HTTP] Request failed, error: ");
    Serial.println(http.errorToString(httpCode).c_str());

    // Buffer to offline queue
    if (offlineCount < OFFLINE_QUEUE_SIZE) {
      offlineQueue[offlineCount].uid = uid;
      offlineQueue[offlineCount].timestamp = millis();
      offlineCount++;
      showOfflineStoredScreen(offlineCount);
      beepWarningOffline();
    }
  }

  http.end();
}

void processOfflineQueue() {
  if (offlineCount == 0 || WiFi.status() != WL_CONNECTED) return;

  Serial.print("[Sync] Syncing ");
  Serial.print(offlineCount);
  Serial.println(" offline records to ERP...");

  int syncedCount = 0;
  for (int i = 0; i < offlineCount; i++) {
    HTTPClient http;
    http.begin(String(ERP_BASE_URL) + "/api/attendance/rfid-checkin");
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", API_KEY);

    JsonDocument doc;
    doc["rfidTag"] = offlineQueue[i].uid;
    doc["deviceId"] = DEVICE_ID;
    doc["offline"] = true;
    String payload;
    serializeJson(doc, payload);

    int code = http.POST(payload);
    if (code > 0) {
      syncedCount++;
    }
    http.end();
    delay(100);
  }

  Serial.print("[Sync] Finished. Successfully synced: ");
  Serial.print(syncedCount);
  Serial.print(" / ");
  Serial.println(offlineCount);

  offlineCount = 0;
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(String(ERP_BASE_URL) + "/api/attendance/rfid-heartbeat");
  http.setTimeout(3000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);

  JsonDocument doc;
  doc["deviceId"] = DEVICE_ID;
  doc["uptime"] = millis() / 1000;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["wifiRSSI"] = WiFi.RSSI();
  doc["offlineQueue"] = offlineCount;

  String payload;
  serializeJson(doc, payload);

  int code = http.POST(payload);
  Serial.print("[Heartbeat] Sent (RSSI: ");
  Serial.print(WiFi.RSSI());
  Serial.print(" dBm, Free Heap: ");
  Serial.print(ESP.getFreeHeap());
  Serial.print(" bytes, Code: ");
  Serial.print(code);
  Serial.println(")");

  http.end();
}

// ═════════════════════════════════════════════════════════════════════
// 10. SETUP & INITIALIZATION
// ═════════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n=======================================================");
  Serial.println("  Shree Kamal Hospital — ESP32 RFID Attendance Scanner  ");
  Serial.println("=======================================================");

  // Initialize Buzzer & LED
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_INDICATOR_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_INDICATOR_PIN, LOW);

  // Initialize I2C Bus for LCD (SDA=21, SCL=22)
  Wire.begin(21, 22);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.createChar(1, iconCheck);
  lcd.createChar(2, iconCross);
  lcd.createChar(3, iconCard);
  lcd.createChar(4, iconWifi);

  lcd.clear();
  lcdCenterText(0, "SHREE KAMAL");
  lcdCenterText(1, "Booting...");

  // Quick initial test beep
  beepClick();
  delay(500);

  // Initialize SPI Bus & MFRC522 RFID
  SPI.begin(); // Standard VSPI: SCK=18, MISO=19, MOSI=23, SS=5
  rfid.PCD_Init();
  delay(100);

  // Check if RC522 responded
  byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("[ERROR] MFRC522 RFID Reader NOT detected!");
    Serial.println("  --> Check 3.3V, GND, MOSI(23), MISO(19), SCK(18), SDA(5)");
    lcd.clear();
    lcdCenterText(0, "RFID NOT FOUND!");
    lcdCenterText(1, "Check 3.3V/Wiring");
    beepError();
    delay(2000);
  } else {
    Serial.print("[RC522] RFID Module Online! Firmware Ver: 0x");
    Serial.println(version, HEX);
  }

  // Connect to Hospital Wi-Fi
  connectWiFi();

  // Show Idle screen ready to scan
  beepSuccessCheckin();
  showIdleScreen();
  Serial.println("[System] Initialization complete. Waiting for RFID card taps...\n");
}

// ═════════════════════════════════════════════════════════════════════
// 11. MAIN LOOP
// ═════════════════════════════════════════════════════════════════════
void loop() {
  // 1. Reset LCD to Idle screen after displaying feedback
  if (isShowingMessage && (millis() - displayMessageTimestamp > DISPLAY_RESET_MS)) {
    showIdleScreen();
  }

  // 2. Periodic Heartbeat to ERP
  if (millis() - lastHeartbeatTimestamp > HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeatTimestamp = millis();
  }

  // 3. Process queued offline scans if connected
  if (offlineCount > 0 && WiFi.status() == WL_CONNECTED) {
    processOfflineQueue();
  }

  // 4. Auto-reconnect WiFi if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnectAttempt = 0;
    if (millis() - lastReconnectAttempt > 10000) {
      Serial.println("[WiFi] Connection dropped. Reconnecting...");
      WiFi.reconnect();
      lastReconnectAttempt = millis();
    }
  }

  // 5. Look for new RFID Cards
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }
  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }

  // Format Card UID as uppercase hex string: "B3:4A:2C:19"
  String cardUID = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (i > 0) cardUID += ":";
    if (rfid.uid.uidByte[i] < 0x10) cardUID += "0";
    cardUID += String(rfid.uid.uidByte[i], HEX);
  }
  cardUID.toUpperCase();

  Serial.println("----------------------------------------");
  Serial.print("[RFID] Card Detected! UID: ");
  Serial.println(cardUID);

  // Anti-tamper / Cooldown: Ignore card held against reader
  if (cardUID == lastScannedUID && (millis() - lastScanTimestamp < SCAN_COOLDOWN_MS)) {
    Serial.println("[RFID] Tap cooldown active. Ignoring duplicate read.");
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }

  lastScannedUID = cardUID;
  lastScanTimestamp = millis();

  // Instant tactile feedback
  beepClick();

  // Show reading status on LCD
  lcd.clear();
  lcdCenterText(0, "Verifying Card");
  lcdCenterText(1, cardUID.substring(0, 16));

  // Send check-in/out to Hospital ERP
  sendCheckinRequest(cardUID);

  // Stop encryption & halt card
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}
