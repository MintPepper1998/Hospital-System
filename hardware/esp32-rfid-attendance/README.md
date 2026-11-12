# ESP32 RFID Attendance System — Shree Kamal Hospital

Hardware firmware and wiring guide for the ESP32-based RFID Staff Attendance Station with RC522 Reader, 16x2 I2C LCD, and Active Buzzer.

---

## 1. Components Required

| # | Component | Specifications |
|---|---|---|
| 1 | **ESP32 DevKit** | 30-pin or 38-pin (ESP-WROOM-32) |
| 2 | **RC522 RFID Module** | 13.56 MHz Mifare RFID reader/writer (SPI) |
| 3 | **16x2 Character LCD** | With pre-soldered I2C backpack (PCF8574, 4 pins) |
| 4 | **Buzzer** | 5V or 3.3V Active Buzzer (2 pins: + and -) |
| 5 | **Breadboard** | Standard 830-point solderless breadboard |
| 6 | **Jumper Wires** | Male-to-Male (M-M) and Male-to-Female (M-F) |
| 7 | **RFID Cards/Fobs** | 13.56 MHz Mifare Classic 1K cards |

---

## 2. Pin-to-Pin Connection Diagram

### A. RC522 RFID Reader $\to$ ESP32 (SPI Interface)
> ⚠️ **CRITICAL**: Connect RC522 `3.3V` pin to **ESP32 3V3** ONLY. Do NOT connect to 5V or VIN (5V will permanently burn the RC522 chip)!

| RC522 Pin | ESP32 Pin | Function |
|---|---|---|
| **3.3V** | **3V3** | 3.3V Logic & Power |
| **RST** | **GPIO 4** | Reset |
| **GND** | **GND** | Ground |
| **IRQ** | *Not Connected* | Leave open |
| **MISO** | **GPIO 19** | VSPI MISO (Master In Slave Out) |
| **MOSI** | **GPIO 23** | VSPI MOSI (Master Out Slave In) |
| **SCK** | **GPIO 18** | VSPI Clock |
| **SDA (SS)** | **GPIO 5** | VSPI Chip Select (SS) |

---

### B. 16x2 I2C LCD $\to$ ESP32 (I2C Interface)
> 💡 **NOTE**: The LCD display needs **5V (VIN)** to power the liquid crystals and backlight for sharp contrast. The I2C signals (SDA/SCL) connect directly to ESP32 GPIO 21 and 22.

| LCD I2C Pin | ESP32 Pin | Function |
|---|---|---|
| **GND** | **GND** | Ground |
| **VCC** | **VIN (5V)** | 5V from USB port |
| **SDA** | **GPIO 21** | I2C Data line |
| **SCL** | **GPIO 22** | I2C Clock line |

> **Contrast Screw**: On the back of the LCD I2C backpack is a small blue potentiometer. If you power the board and see blank blocks or nothing at all, turn this screw with a small screwdriver until characters appear sharp and clear!

---

### C. Active Buzzer $\to$ ESP32
| Buzzer Pin | ESP32 Pin | Function |
|---|---|---|
| **Positive (+ / Long pin)** | **GPIO 13** | Signal output |
| **Negative (- / Short pin)** | **GND** | Ground |

---

## 3. Breadboard Placement Guide (830-Point Breadboard)

Because the ESP32 is wide, if you place it in the center of an 830-point breadboard, it usually covers all holes on one side. Here are the 2 best ways to mount it:

### Method 1 (Direct Breadboard Mount):
1. Plug the ESP32 with its micro-USB port facing the edge of the breadboard.
2. Align it so the left pin header sits right at the center groove, leaving **1 full row of holes on one side** and **2 rows on the other side** (if using a 30-pin board).
3. Connect the top power rail to **GND** and the bottom power rail to **3.3V** or **5V (VIN)**.

### Method 2 (Off-board with Female-to-Male Jumpers — Recommended for clean setup):
1. Keep the ESP32, LCD, and RFID reader beside the breadboard.
2. Use Female-to-Male jumper wires from the modules to the breadboard power rails and ESP32 pins.
3. This keeps the RFID reader flat on your desk so staff can tap cards without bumping wires.

---

## 4. Software Setup in Arduino IDE

### Step 1: Install ESP32 Board Support
1. In Arduino IDE, go to **File $\to$ Preferences**.
2. Add this URL to **Additional Boards Manager URLs**:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Go to **Tools $\to$ Board $\to$ Boards Manager**, search for `esp32` by Espressif Systems, and click **Install**.

### Step 2: Install Libraries
Go to **Sketch $\to$ Include Library $\to$ Manage Libraries...** and install:
1. `MFRC522` by GithubCommunity
2. `LiquidCrystal_I2C` by Frank de Brabander (or Marco Schwartz)
3. `ArduinoJson` by Benoit Blanchon (version 7.x)

### Step 3: Run Hardware Diagnostic Test
Open `test_hardware.ino`, select your board: **DOIT ESP32 DEVKIT V1**, select your COM port, and upload.
- Opens Serial Monitor at **115200 baud**.
- Verifies I2C address of LCD (0x27).
- Plays 2 test beeps.
- Tests RFID card scanning.

### Step 4: Upload Full Firmware
Open `esp32_rfid_attendance.ino`:
1. Change `WIFI_SSID` and `WIFI_PASSWORD`.
2. Set `ERP_BASE_URL` (e.g. `http://192.168.1.50:3000` or your hospital domain).
3. Set `API_KEY` (defaults to `rfid-attendance-secret-key` in `.env`).
4. Click **Upload**.

---

## 5. Testing with Shree Kamal Hospital ERP

1. Open your browser and go to `/dashboard/hr/rfid-cards`.
2. Tap a new RFID card on the reader.
3. The reader LCD will display: `UNKNOWN CARD!` and show the UID (e.g. `B3:4A:2C:19`).
4. In the ERP web portal, click **Assign RFID Card** next to any doctor, nurse, or staff member.
5. Enter the UID `B3:4A:2C:19` and click Save.
6. Now tap the card again on the reader:
   - **First Tap (Morning)**: LCD shows `IN: Dr. John Doe` + Cheerful double-beep + Recorded as **CHECK_IN** in ERP!
   - **Second Tap (Evening)**: LCD shows `OUT: Dr. John Doe` + Solid confirmation beep + Recorded as **CHECK_OUT** in ERP!
   - Check the live activity under **HR & Attendance**!
