/*
 * ============================================================
 *  NodeMCU ESP8266 RFID Attendance — Shree Kamal Hospital
 * ============================================================
 *
 *  Hardware:
 *    NodeMCU ESP8266 (v3, 30-pin)
 *    MFRC522 RC522 RFID Reader (13.56 MHz, SPI)
 *    16x2 I2C LCD Display (with PCF8574 I2C backpack)
 *    Active Buzzer
 *
 *  Wiring (NodeMCU → RC522, SPI):
 *    D8  (GPIO 15) → SDA (SS)
 *    D5  (GPIO 14) → SCK
 *    D7  (GPIO 13) → MOSI
 *    D6  (GPIO 12) → MISO
 *    D1  (GPIO 5)  → RST
 *    3.3V          → 3.3V
 *    GND           → GND
 *
 *  Wiring (NodeMCU → LCD, I2C):
 *    D2  (GPIO 4)  → SDA
 *    D3  (GPIO 0)  → SCL       ** see note below
 *    VIN (5V)      → VCC       ** LCD needs 5V!
 *    GND           → GND
 *
 *  Wiring (NodeMCU → Buzzer):
 *    D4  (GPIO 2)  → +
 *    GND           → -
 *
 *  NOTE on D3 (GPIO 0):
 *    GPIO 0 must be HIGH during boot. The I2C pull-up resistor
 *    on the LCD module keeps it HIGH, so this is safe. But if the
 *    board won't boot, disconnect the LCD SCL wire, power on,
 *    then reconnect it.
 *
 *  Libraries (install via Arduino Library Manager):
 *    1. MFRC522 by GithubCommunity
 *    2. ArduinoJson by Benoit Blanchon (v7+)
 *    3. LiquidCrystal_I2C by Frank de Brabander
 *    4. ESP8266 board package (v3.0+)
 *
 *  Arduino IDE Settings:
 *    Board: "NodeMCU 1.0 (ESP-12E Module)"
 *    Upload Speed: 115200
 *    Flash Size: "4MB (FS:2MB OTA:~1019KB)"
 *
 *  Board Manager URL (add in Preferences → Additional Board URLs):
 *    http://arduino.esp8266.com/stable/package_esp8266com_index.json
 *
 * ============================================================
 */

#include <SPI.h>
#include <MFRC522.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ════════════════════════════════════════════
// CONFIGURATION — CHANGE THESE VALUES
// ════════════════════════════════════════════

const char* WIFI_SSID     = "YOUR_HOSPITAL_WIFI";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* ERP_BASE_URL = "http://192.168.1.100:3000";  // Your ERP server IP
const char* API_KEY      = "rfid-attendance-secret-key";   // Must match RFID_API_KEY in .env
const char* DEVICE_ID    = "ENTRANCE-1";                   // Unique name for this reader

// ════════════════════════════════════════════
// PIN DEFINITIONS (NodeMCU labels → GPIO)
// ════════════════════════════════════════════

// RC522 (SPI) — uses NodeMCU's hardware SPI pins
#define SS_PIN    15   // D8
#define RST_PIN   5    // D1

// LCD (I2C)
// SDA = D2 (GPIO 4)  — set in Wire.begin()
// SCL = D3 (GPIO 0)  — set in Wire.begin()
#define LCD_ADDR  0x27   // Most PCF8574 modules use 0x27. Try 0x3F if LCD doesn't work.

// Buzzer
#define BUZZER    2    // D4 (GPIO 2)

// ════════════════════════════════════════════
// TIMING
// ════════════════════════════════════════════

#define SCAN_COOLDOWN_MS    3000
#define HEARTBEAT_INTERVAL  60000
#define HTTP_TIMEOUT        5000
#define OFFLINE_QUEUE_SIZE  30     // ESP8266 has less RAM than ESP32
#define DISPLAY_RESET_MS    4000   // Show message for 4 seconds

// ════════════════════════════════════════════
// CUSTOM CHARACTERS (icons for LCD)
// ════════════════════════════════════════════

// Check mark ✓
byte checkChar[8] = {
  0b00000,
  0b00001,
  0b00010,
  0b10100,
  0b01000,
  0b00000,
  0b00000,
  0b00000
};

// Cross mark ✗
byte crossChar[8] = {
  0b00000,
  0b10001,
  0b01010,
  0b00100,
  0b01010,
  0b10001,
  0b00000,
  0b00000
};

// Card icon
byte cardChar[8] = {
  0b11111,
  0b10001,
  0b10001,
  0b11111,
  0b10001,
  0b10001,
  0b11111,
  0b00000
};

// ════════════════════════════════════════════
// GLOBALS
// ════════════════════════════════════════════

MFRC522 rfid(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);

String lastUID = "";
unsigned long lastScanTime = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastDisplayUpdate = 0;
bool showingMessage = false;

struct OfflineScan { String uid; unsigned long ts; };
OfflineScan offlineQueue[OFFLINE_QUEUE_SIZE];
int offlineCount = 0;

// ════════════════════════════════════════════
// LCD DISPLAY HELPERS
// ════════════════════════════════════════════

void lcdClear() {
  lcd.clear();
}

void lcdPrint(int col, int row, const char* text) {
  lcd.setCursor(col, row);
  lcd.print(text);
}

void lcdPrint(int col, int row, String text) {
  lcd.setCursor(col, row);
  lcd.print(text);
}

// Center text on a 16-char row
void lcdCenter(int row, const char* text) {
  int len = strlen(text);
  int col = (16 - len) / 2;
  if (col < 0) col = 0;
  lcd.setCursor(col, row);
  lcd.print(text);
}

void lcdCenter(int row, String text) {
  lcdCenter(row, text.c_str());
}

// Truncate name to fit 16 chars
String fitName(String name) {
  if (name.length() > 16) {
    return name.substring(0, 16);
  }
  return name;
}

void showIdle() {
  lcdClear();
  lcdCenter(0, "SHREE KAMAL");
  lcd.setCursor(0, 1);
  lcd.write(3);  // card icon
  lcd.print(" Tap your card");
  showingMessage = false;
}

void showCheckin(const char* name) {
  lcdClear();
  lcd.setCursor(0, 0);
  lcd.write(1);  // check mark
  lcd.print(" CHECK IN");
  lcdPrint(0, 1, fitName(String(name)));
  showingMessage = true;
  lastDisplayUpdate = millis();
}

void showCheckout(const char* name) {
  lcdClear();
  lcd.setCursor(0, 0);
  lcd.write(1);  // check mark
  lcd.print(" CHECK OUT");
  lcdPrint(0, 1, fitName(String(name)));
  showingMessage = true;
  lastDisplayUpdate = millis();
}

void showError(const char* line1, const char* line2) {
  lcdClear();
  lcd.setCursor(0, 0);
  lcd.write(2);  // cross mark
  lcd.print(" ");
  lcd.print(line1);
  if (line2 != nullptr) {
    lcdPrint(0, 1, line2);
  }
  showingMessage = true;
  lastDisplayUpdate = millis();
}

void showWifiConnecting() {
  lcdClear();
  lcdCenter(0, "WiFi...");
  lcdCenter(1, WIFI_SSID);
}

void showWifiConnected() {
  lcdClear();
  lcdCenter(0, "WiFi OK!");
  lcdCenter(1, WiFi.localIP().toString());
}

void showOfflineStored(int count) {
  lcdClear();
  lcdCenter(0, "OFFLINE SAVED");
  lcdPrint(0, 1, "Queue: " + String(count) + "/" + String(OFFLINE_QUEUE_SIZE));
  showingMessage = true;
  lastDisplayUpdate = millis();
}

// ════════════════════════════════════════════
// SETUP
// ════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("===================================");
  Serial.println("  Shree Kamal Hospital RFID Reader");
  Serial.println("  Board: NodeMCU ESP8266");
  Serial.println("===================================");

  // Buzzer
  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);

  // Initialize I2C for LCD (SDA=D2/GPIO4, SCL=D3/GPIO0)
  Wire.begin(4, 0);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.createChar(1, checkChar);
  lcd.createChar(2, crossChar);
  lcd.createChar(3, cardChar);
  lcdClear();
  lcdCenter(0, "Starting...");
  lcdCenter(1, "Please wait");
  Serial.println("LCD OK.");

  // Initialize SPI + RC522
  SPI.begin();
  rfid.PCD_Init();
  delay(100);

  byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("ERROR: RC522 not detected!");
    showError("RC522 ERROR!", "Check wiring");
  } else {
    Serial.print("RC522 OK. FW: 0x");
    Serial.println(version, HEX);
  }

  // Connect WiFi
  showWifiConnecting();
  connectWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    showWifiConnected();
  } else {
    showError("WiFi FAILED", "Working offline");
  }
  delay(2000);

  // Ready
  successBeep();
  showIdle();
  Serial.println("Ready - waiting for card tap...");
}

// ════════════════════════════════════════════
// MAIN LOOP
// ════════════════════════════════════════════

void loop() {
  // Return display to idle after showing a message
  if (showingMessage && (millis() - lastDisplayUpdate > DISPLAY_RESET_MS)) {
    showIdle();
  }

  // WiFi reconnect
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Process offline queue
  if (offlineCount > 0 && WiFi.status() == WL_CONNECTED) {
    processOfflineQueue();
  }

  // Heartbeat
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }

  // Check for card
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  String uid = getUID();
  Serial.print("Card: ");
  Serial.println(uid);

  // Anti-spam
  if (uid == lastUID && (millis() - lastScanTime) < SCAN_COOLDOWN_MS) {
    Serial.println("  Cooldown, ignoring");
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }

  lastUID = uid;
  lastScanTime = millis();

  // Show scanning animation
  lcdClear();
  lcdCenter(0, "Scanning...");

  if (WiFi.status() == WL_CONNECTED) {
    sendCheckin(uid);
  } else {
    if (offlineCount < OFFLINE_QUEUE_SIZE) {
      offlineQueue[offlineCount].uid = uid;
      offlineQueue[offlineCount].ts = millis();
      offlineCount++;
      showOfflineStored(offlineCount);
      warningBeep();
    } else {
      showError("Queue full!", "Cannot save");
      errorBeep();
    }
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

// ════════════════════════════════════════════
// RFID
// ════════════════════════════════════════════

String getUID() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (i > 0) uid += ":";
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

// ════════════════════════════════════════════
// HTTP
// ════════════════════════════════════════════

void sendCheckin(String uid) {
  WiFiClient client;
  HTTPClient http;
  String url = String(ERP_BASE_URL) + "/api/attendance/rfid-checkin";

  http.begin(client, url);
  http.setTimeout(HTTP_TIMEOUT);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);

  JsonDocument doc;
  doc["rfidTag"] = uid;
  doc["deviceId"] = DEVICE_ID;
  String payload;
  serializeJson(doc, payload);

  Serial.print("  Sending... ");
  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    JsonDocument resDoc;
    DeserializationError err = deserializeJson(resDoc, response);

    if (!err && resDoc["success"].as<bool>()) {
      String staffName = resDoc["staffName"].as<String>();
      String action = resDoc["action"].as<String>();
      Serial.println(action + ": " + staffName);

      if (action == "CHECK_IN") {
        showCheckin(staffName.c_str());
      } else {
        showCheckout(staffName.c_str());
      }
      successBeep();
    } else {
      String error = resDoc["error"].as<String>();
      Serial.println("Error: " + error);

      if (error == "UNKNOWN_CARD") {
        showError("Unknown card!", "Register in ERP");
      } else if (error == "ALREADY_COMPLETE") {
        showError("Already done", "for today");
      } else {
        showError("Error:", error.c_str());
      }
      errorBeep();
    }
  } else {
    Serial.println("FAILED: " + String(httpCode));
    showError("Network error!", "Saved offline");
    errorBeep();

    if (offlineCount < OFFLINE_QUEUE_SIZE) {
      offlineQueue[offlineCount].uid = uid;
      offlineQueue[offlineCount].ts = millis();
      offlineCount++;
    }
  }
  http.end();
}

void processOfflineQueue() {
  Serial.println("Syncing offline queue (" + String(offlineCount) + ")...");
  lcdClear();
  lcdCenter(0, "Syncing...");

  int ok = 0;
  for (int i = 0; i < offlineCount; i++) {
    WiFiClient client;
    HTTPClient http;
    http.begin(client, String(ERP_BASE_URL) + "/api/attendance/rfid-checkin");
    http.setTimeout(HTTP_TIMEOUT);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", API_KEY);

    JsonDocument doc;
    doc["rfidTag"] = offlineQueue[i].uid;
    doc["deviceId"] = DEVICE_ID;
    doc["offline"] = true;
    String payload;
    serializeJson(doc, payload);

    lcdPrint(0, 1, String(i + 1) + "/" + String(offlineCount));

    if (http.POST(payload) > 0) ok++;
    http.end();
    delay(200);
  }

  Serial.println("  Synced: " + String(ok) + "/" + String(offlineCount));
  offlineCount = 0;
  showIdle();
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClient client;
  HTTPClient http;
  http.begin(client, String(ERP_BASE_URL) + "/api/attendance/rfid-heartbeat");
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

  http.POST(payload);
  Serial.println("Heartbeat (RSSI: " + String(WiFi.RSSI()) + " dBm)");
  http.end();
}

// ════════════════════════════════════════════
// WIFI
// ════════════════════════════════════════════

void connectWiFi() {
  Serial.print("WiFi: " + String(WIFI_SSID));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" OK! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println(" FAILED");
  }
}

// ════════════════════════════════════════════
// BUZZER FEEDBACK
// ════════════════════════════════════════════

void successBeep() {
  // Note: GPIO 2 (D4) is also the onboard LED — it will blink too!
  digitalWrite(BUZZER, HIGH); delay(100);
  digitalWrite(BUZZER, LOW);  delay(80);
  digitalWrite(BUZZER, HIGH); delay(100);
  digitalWrite(BUZZER, LOW);
}

void errorBeep() {
  digitalWrite(BUZZER, HIGH); delay(500);
  digitalWrite(BUZZER, LOW);
}

void warningBeep() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER, HIGH); delay(80);
    digitalWrite(BUZZER, LOW);  delay(80);
  }
}
