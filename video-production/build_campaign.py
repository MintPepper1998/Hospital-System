"""Build five portrait campaign videos from the supplied screen recordings."""
from __future__ import annotations
import json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PY = sys.executable
SRC = Path(r"C:/Users/biswa/Videos/hospital video")

def s(name, start, duration, eyebrow, title, body):
    return {"source": str(SRC / name), "start": start, "duration": duration,
            "crop": [0, 0, 1920, 1080], "eyebrow": eyebrow, "title": title, "body": body}

END = {"source": None, "start": 0, "duration": 5, "eyebrow": "HOSPITAL MANAGER",
       "title": "Book your private demonstration.",
       "body": "Custom hospital software. Founding Partner pricing available now."}

VIDEOS = [
    ("01-custom-built", [
        s("01-dashboard-overview.mp4", 7, 5, "HOSPITAL MANAGER", "Your hospital is not a template.", "This is not off-the-shelf software. It is a completely custom-built Hospital ERP designed around the way you want to work."),
        s("03-demo-opd-consultation.mp4", 40, 5, "OPD • CONSULTATION • EMR", "Built around your workflows.", "From OPD and consultation to clinical records, your hospital gets a system shaped around its operations."),
        s("06-hospital-settings-print-preview.mp4", 24, 5, "CONFIGURATION • PRINT • BRAND", "Your process. Your implementation.", "We configure the workflows, documents and screens your teams actually need."),
        END]),
    ("02-financial-visibility", [
        s("05-demo-billing-visibilit.mp4", 2, 7, "FINANCE • LEDGERS • CONTROL", "Total financial transparency.", "Track hospital and pharmacy operations with the clarity your finance team expects."),
        s("04-demo-pharmacy-workflow.mp4", 15, 6, "PHARMACY FINANCE", "Separate financial ledgers for pharmacy and hospital.", "Need a dedicated financial view for pharmacy? Done. Your departments can work with the structure you choose."),
        s("05-demo-billing-visibilit.mp4", 34, 6, "CASH • COLLECTIONS • LEDGER", "Designed to stop daily cash leakage.", "Bring collections and ledger visibility together so every rupee has a clearer place in the workflow."),
        END]),
    ("03_connected_departments", [
        s("02-demo-patient-registration.mp4", 36, 6, "RECEPTION • REGISTRATION", "Multiple reception desks? Done.", "Support the way your front desk is organized, with a workflow built for your hospital."),
        s("03-demo-opd-consultation.mp4", 40, 6, "DOCTOR AVAILABILITY • OPD", "Give doctors the right availability view.", "Make doctor availability and consultation flow easier for reception and clinical teams to follow."),
        s("04-demo-pharmacy-workflow.mp4", 15, 6, "PHARMACY • HANDOFF", "One connected hospital journey.", "Connect reception, consultation, pharmacy and billing in one hospital-specific system."),
        END]),
    ("04_ownership_model", [
        s("01-dashboard-overview.mp4", 20, 5, "OWN YOUR OPERATIONS", "Stop adapting to rigid software.", "Build the operational model your hospital needs instead of forcing every department into a fixed template."),
        s("06-hospital-settings-print-preview.mp4", 24, 6, "CUSTOMIZATION • DOCUMENTS", "A lifetime license, not a monthly subscription.", "We are offering a one-time lifetime license so your hospital owns the software it invests in."),
        s("05-demo-billing-visibilit.mp4", 14, 6, "CLEAR COMMERCIAL VALUE", "Invest in your hospital's system.", "Ask us about implementation, support and the ownership terms behind Hospital Manager."),
        END]),
    ("05_founding_partner", [
        s("03-demo-opd-consultation.mp4", 70, 6, "SEE IT IN ACTION", "Do not buy another generic demo.", "Bring us your workflow and see how Hospital Manager maps it across clinical and operational teams."),
        s("05-demo-billing-visibilit.mp4", 42, 6, "FOUNDING PARTNER PROGRAM", "Be one of the first hospitals to shape the system.", "Founding Partners receive exclusive pricing and a direct path to a hospital-specific implementation."),
        s("06-hospital-settings-print-preview.mp4", 34, 5, "NEXT STEP", "Your hospital. Your workflow.", "Book a private demonstration and let us understand what your hospital needs."),
        END]),
]

def main():
    for slug, scenes in VIDEOS:
        edit_name = f"campaign-{slug}.json"
        data = {"output": f"output/{slug}-portrait.mp4", "scenes": scenes}
        (ROOT / edit_name).write_text(json.dumps(data, indent=2), encoding="utf-8")
        subprocess.run([PY, str(ROOT / "artwork.py"), "--edit", edit_name], check=True)
        subprocess.run([PY, str(ROOT / "render.py"), "--edit", edit_name], check=True)
    print(f"Built {len(VIDEOS)} portrait campaign videos in {ROOT / 'output'}")

if __name__ == "__main__":
    main()
