# Point of Sale & Billing

The Pharmacy module acts as an independent billing center within the ERP, capable of handling out-patient purchases, in-patient prescriptions, and over-the-counter sales.

## POS Interface

![Pharmacy POS](../assets/pharmacy-pos.png)

### Making a Sale
1. **Select Patient**: Choose an existing registered patient or select "Walk-in Customer" for over-the-counter sales.
2. **Search Inventory**: Search for medicines by brand name or generic name. The system will automatically show the available stock and current batch expiry dates.
3. **Add to Cart**: Enter the quantity. The system warns the pharmacist if the requested quantity exceeds the available batch stock.
4. **GST Calculation**: The POS system automatically calculates the exact GST (e.g., 0%, 5%, 12%, 18%) based on the HSN code configuration of each medicine.

### Integrated Prescriptions
If a patient was just seen by a doctor, their electronic prescription will automatically appear in the Pharmacist's queue. The pharmacist can click **Load Prescription** to automatically populate the POS cart with the prescribed medicines, drastically reducing wait times and data entry errors.
