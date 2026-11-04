# IPD Discharge Summary Synchronization Plan

## Objective
Synchronize the Discharge Summary workflow so that the dynamic fields configured in the **Discharge Type Management** are seamlessly used across both the **Patient 360 Discharge Summary Editor** (used by Doctors) and the **IPD Discharge & Settlement** page (used by Billing/Admin). Data entered in one place must automatically populate in the other to guarantee a single source of truth and a flawless workflow.

## 1. Database & Schema Updates
To support dynamic templates without breaking existing hardcoded fields:
1. **Extend `IPDAdmission` Model:**
   - Add `dischargeTypeCode String?`: To link the admission to the dynamic `DischargeTypeConfig`.
   - Add `customDischargeData Json?`: To store values for any dynamic `sectionKey`s that do not map to the legacy hardcoded strings.
2. **Migration Strategy:**
   - Run `npx prisma db push` to safely update the schema.
   - Retain existing fields (`finalDiagnosis`, `courseInHospital`, etc.) to ensure legacy records are not broken. 
   - New form submissions will save standard keys to their respective columns and non-standard keys to the `customDischargeData` JSON column.

## 2. Shared Form State & API Payload
Create a unified type/interface for the discharge data payload to be used by both interfaces.
- The payload will be a simple `Record<string, string>`, where keys correspond to the `sectionKey`s from `DischargeTypeConfig`.
- When fetching an admission for the UI, a new utility function will merge the legacy fields (like `finalDiagnosis`) and the `customDischargeData` JSON into a single flat key-value object to populate the dynamic form.

## 3. Patient 360° View: Discharge Summary Editor Update
- **Current State:** Hardcoded form fields for the doctor.
- **New Flow:**
  - Fetch `active` Discharge Types from `DischargeTypeConfig`.
  - Provide a dropdown for the doctor to select the "Discharge Type".
  - When a type is selected, dynamically render the form inputs based on the `templateSections` array (e.g., Provisional Diagnosis, Course in Hospital, Reason for LAMA, etc.).
  - Update the `saveDischargeSummary` Server Action to save this dynamic payload, routing standard keys to standard columns and the rest to the JSON column.

## 4. IPD Discharge & Settlement Page Update
- **Current State:** The accountant/billing user sees a summary with hardcoded fields.
- **New Flow:**
  - Fetch the saved `dischargeTypeCode` and `customDischargeData` for the admission.
  - Render the same dynamic form fields based on the selected config's `templateSections`.
  - Pre-fill the form with the exact data the doctor entered in Patient 360.
  - Allow the user to adjust or finalize the data if needed before hitting "Settle & Discharge".

## 5. Server Actions Update
Update the following Server Actions in `app/actions/ipd.ts` (or relevant billing actions):
- `saveDischargeSummary(admissionId, payload, dischargeTypeCode)`
- `settleAndDischargePatient(admissionId, payload, ...)`
- Both actions will utilize a shared internal function `mapDynamicDischargeData(payload)` to correctly separate fields into Prisma's standard columns vs. the JSON column.

## 6. Execution Steps & Verification
1. **Step 1:** Modify `prisma/schema.prisma` and push.
2. **Step 2:** Build a unified `DynamicDischargeForm` component (or shared hook) to render `templateSections`.
3. **Step 3:** Implement changes in Patient 360 (`app/dashboard/clinical/patient-360/...`).
4. **Step 4:** Implement changes in IPD Discharge (`app/dashboard/ipd/discharge/...`).
5. **Step 5:** Perform end-to-end testing: 
   - Configure a dynamic type like "LAMA".
   - Doctor fills it in Patient 360.
   - Accountant views it in IPD Discharge & Settlement.
   - Finalize the discharge and print.

*Waiting for user approval to proceed with Execution Step 1.*
