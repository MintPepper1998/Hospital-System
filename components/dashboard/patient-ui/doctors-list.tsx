"use client";

import { Stethoscope, Eye, WarningCircle } from "@phosphor-icons/react/dist/ssr";

/* Specialty → icon mapping for the far-right icon */
function getSpecialtyIcon(specialization: string) {
  const spec = specialization.toLowerCase();
  if (spec.includes("eye") || spec.includes("retina") || spec.includes("ophthalm"))
    return <Eye weight="light" size={18} className="text-[#94a3b8]" />;
  return <Stethoscope weight="light" size={18} className="text-[#94a3b8]" />;
}

export default function DoctorsList({ doctors }: { doctors: any[] }) {
  if (!doctors || doctors.length === 0) {
    return (
      <div className="bg-white rounded-2xl sm:rounded-3xl xl:rounded-[32px] p-4 sm:p-6 shadow-sm border border-gray-100 h-full flex flex-col">
        <h3 className="text-base sm:text-lg font-bold text-[#1e293b] mb-4">My Doctors</h3>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-3">
            <WarningCircle size={24} weight="regular" />
          </div>
          <p className="text-sm text-[#64748b]">No doctors found in your history.</p>
        </div>
      </div>
    );
  }

  const primaryDoctor = doctors[0];
  const recentDoctors = doctors.slice(1, 4);

  const getDoctorName = (doc: any) => doc?.user?.name || "Unknown Doctor";
  const getSpecialization = (doc: any) => doc?.specialization || doc?.department || "Consultant";
  const getAvatar = (doc: any) => doc?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(getDoctorName(doc))}&background=f8f9fb&color=1e293b`;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl xl:rounded-[32px] p-4 sm:p-6 shadow-sm border border-gray-100 h-full flex flex-col">
      <h3 className="text-base sm:text-lg font-bold text-[#1e293b] mb-4">My Doctors</h3>
      
      {/* Primary Doctor Card — matches image_8.png */}
      {primaryDoctor && (
        <div className="bg-[#f8f9fb] rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-gray-100 mb-4 sm:mb-5">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <img 
              src={getAvatar(primaryDoctor)} 
              alt={getDoctorName(primaryDoctor)} 
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-sm border-2 border-white object-cover flex-shrink-0"
            />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#1e293b] truncate">{getDoctorName(primaryDoctor)}</h4>
              <p className="text-[10px] sm:text-[11px] text-[#64748b] truncate">Primary Consultant · {getSpecialization(primaryDoctor)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 bg-[#1a56db] hover:bg-[#1e40af] text-white py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors shadow-sm active:scale-[0.97]">
              View Profile
            </button>
            <button className="flex-1 bg-white hover:bg-gray-50 text-[#1e293b] border border-gray-200 py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors active:scale-[0.97]">
              Message
            </button>
          </div>
        </div>
      )}

      {/* Recent Doctors List — flex row layout matching image_8.png */}
      {recentDoctors.length > 0 && (
        <>
          <h4 className="text-xs sm:text-sm font-bold text-[#1e293b] mb-3 sm:mb-3.5">Recent Doctors</h4>
          <div className="flex flex-col gap-3 sm:gap-4 overflow-y-auto max-h-[140px] sm:max-h-[180px] scrollbar-hide">
            {recentDoctors.map((doc: any, index: number) => (
              <div key={doc.id || index} className="flex items-center gap-3">
                {/* Avatar */}
                <img 
                  src={getAvatar(doc)} 
                  alt={getDoctorName(doc)} 
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-gray-100 object-cover flex-shrink-0" 
                />
                {/* Name + Specialty */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs font-bold text-[#1e293b] truncate">{getDoctorName(doc)}</p>
                  <p className="text-[9px] sm:text-[10px] text-[#64748b] truncate">{getSpecialization(doc)}</p>
                </div>
                {/* Specialty Icon — far right */}
                <div className="w-9 h-9 rounded-full bg-[#f8f9fb] flex items-center justify-center flex-shrink-0 border border-gray-100">
                  {getSpecialtyIcon(getSpecialization(doc))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
