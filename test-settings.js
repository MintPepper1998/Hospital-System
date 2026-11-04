const { getHospitalSettings } = require('./app/actions/settings')

async function main() {
  try {
    const settings = await getHospitalSettings()
    console.log("Lab Tech Signature:", settings.labTechnicianSignature)
    console.log("Pathologist Signature:", settings.pathologistSignature)
  } catch (e) {
    console.error(e)
  }
}

main()
