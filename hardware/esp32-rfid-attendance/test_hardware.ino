/*
 * =====================================================================
 *  ESP32 Hardware Diagnostic & I2C Scanner Test
 *  Shree Kamal Hospital RFID Attendance System
 * =====================================================================
 *  Use this script to test all breadboard connections BEFORE uploading
 *  the full attendance firmware.
 *
 *  It tests:
 *    1. I2C Bus: Finds LCD address (usually 0x27 or 0x3F)
 *    2. LCD Display: Prints test messages and turns on backlight
 *    3. Buzzer: Plays a quick beep test
 *    4. RC522 RFID Module: Checks SPI communication & reads card UIDs
 * =====================================================================
 */

#include <Wire.h>
#include <SPI.h>
#include <MFRC522.h>
#include <LiquidCrystal_I2C.h>

#define RFID_SS_PIN   5
#define RFID_RST_PIN  4
#define BUZZER_PIN    13

MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2); // Default address, will auto-detect below

byte foundI2CAddr = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n========================================");
  Serial.println("  ESP32 Hardware Diagnostic & Test Suite ");
  Serial.println("========================================");

  // 1. Buzzer Test
  pinMode(BUZZER_PIN, OUTPUT);
  Serial.println("\n[1/4] Testing Buzzer on GPIO 13...");
  digitalWrite(BUZZER_PIN, HIGH); delay(80);
  digitalWrite(BUZZER_PIN, LOW);  delay(60);
  digitalWrite(BUZZER_PIN, HIGH); delay(80);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.println("  --> Buzzer test done (did you hear 2 short beeps?)");

  // 2. I2C Scanner (for 16x2 LCD)
  Serial.println("\n[2/4] Scanning I2C Bus on GPIO 21 (SDA) & GPIO 22 (SCL)...");
  Wire.begin(21, 22);

  int deviceCount = 0;
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("  --> I2C device detected at address 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      foundI2CAddr = address;
      deviceCount++;
    }
  }

  if (deviceCount == 0) {
    Serial.println("  ❌ No I2C devices found! Check LCD VCC (needs 5V), GND, SDA (21), SCL (22).");
  } else {
    Serial.print("  ✅ I2C Scan Complete! Use address: 0x");
    Serial.println(foundI2CAddr, HEX);

    // 3. LCD Screen Test
    Serial.println("\n[3/4] Initializing LCD Display...");
    lcd = LiquidCrystal_I2C(foundI2CAddr, 16, 2);
    lcd.init();
    lcd.backlight();
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("ESP32 TEST OK!");
    lcd.setCursor(0, 1);
    lcd.print("I2C: 0x" + String(foundI2CAddr, HEX) + " 16x2");
    Serial.println("  --> Check LCD screen! If text is faint or blank, TURN THE BLUE POTENTIOMETER ON THE BACK.");
  }

  // 4. RC522 RFID Reader Test
  Serial.println("\n[4/4] Testing MFRC522 RFID Reader over SPI...");
  SPI.begin();
  rfid.PCD_Init();
  delay(100);

  byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("  ❌ MFRC522 NOT detected! Check 3.3V, GND, MOSI(23), MISO(19), SCK(18), SDA(5).");
  } else {
    Serial.print("  ✅ MFRC522 detected successfully! Firmware Version: 0x");
    Serial.println(version, HEX);
    Serial.println("\n>> Tap any RFID card/fob on the reader to test reading! <<\n");
  }
}

void loop() {
  // Check for RFID card
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }

  // Format Card UID
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (i > 0) uid += ":";
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  // Beep & print
  digitalWrite(BUZZER_PIN, HIGH);
  delay(60);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println("--------------------------------");
  Serial.print("💳 CARD DETECTED! UID = ");
  Serial.println(uid);

  if (foundI2CAddr != 0) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("CARD SCANNED!");
    lcd.setCursor(0, 1);
    lcd.print(uid.substring(0, 16));
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(1000);
}
