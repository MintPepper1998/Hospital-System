import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanTransactionalData() {
  console.log('🧹 Cleaning all transactional and patient data...');
  
  try {
    // Delete in order of constraints
    await prisma.billing.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.preAuthorization.deleteMany({});
    await prisma.insuranceClaim.deleteMany({});
    await prisma.insurancePolicy.deleteMany({});
    await prisma.prescription.deleteMany({});
    await prisma.medicalRecord.deleteMany({});
    await prisma.labRequest.deleteMany({});
    await prisma.labOrder.deleteMany({});
    await prisma.surgery.deleteMany({});
    await prisma.operation.deleteMany({});
    await prisma.iPDAdmission.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.patientDocument.deleteMany({});
    await prisma.patient.deleteMany({});
    
    // Delete patient users (those with role PATIENT)
    await prisma.user.deleteMany({
      where: {
        role: 'PATIENT'
      }
    });

    // Reset bed statuses
    await prisma.bed.updateMany({
      data: {
        status: 'AVAILABLE'
      }
    });

    console.log('✅ Successfully cleared all patients, appointments, and bills!');
    console.log('✅ Master data (Admin, Doctors, Medicines, Lab Tests) is preserved.');
  } catch (error) {
    console.error('❌ Error cleaning data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanTransactionalData();
