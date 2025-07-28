import React, { useEffect, useState } from "react";
import { BiHeart, BiDonateHeart } from "react-icons/bi";
import ModalCommon from "../../common/modal";

interface DonateProps {
  show?: boolean;
}

const Donate: React.FC<DonateProps> = ({ show = true }) => {
  const donors: { name: string; amount: number; date?: string }[] = [
    // { name: "Pook Kittipan Khanteemok", amount: 200, date: "11 เม.ย. 2568" },
  ];

  const totalDonations = donors.reduce((sum, donor) => sum + donor.amount, 0);

  return (
    <div className="p-4 max-w-5xl mx-auto text-gray-800">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center bg-gray-100 p-2 rounded-full mb-2">
          <BiDonateHeart className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-semibold text-blue-800 mb-1">
          ช่วยสนับสนุนเรา
        </h2>
        <p className="text-sm text-gray-600 max-w-xl mx-auto">
          การสนับสนุนของคุณช่วยให้นักพัฒนามีกำลังใจพัฒนาโปรเจกต์ต่อไป
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-start justify-center gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 w-full lg:w-1/2">
          <div className="relative rounded-md flex flex-col items-center">
            <div className="absolute top-2 right-2 bg-gray-100 rounded-full px-2 py-1 text-xs text-blue-600 font-medium">
              PromptPay
            </div>
            <img
              src="/IMG_0405.JPG"
              className="w-48 object-cover rounded shadow-sm"
              alt="Donate QR Code"
            />
          </div>
        </div>

        {show === true && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 w-full lg:w-1/2">
            <div className="text-center mb-2">
              <div className="flex items-center justify-center gap-2 mb-1">
                <BiHeart className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-blue-800">
                  ผู้สนับสนุน
                </h3>
              </div>
              <div className="text-xs text-gray-500 mb-1">กรกฎาคม 2568</div>
              <div className="text-sm font-semibold text-blue-600 mb-2">
                ยอดรวม {totalDonations.toLocaleString()} บาท
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${Math.min((totalDonations / 2000) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="space-y-1">
              {donors.map((donor, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-all rounded px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-blue-800">
                      {donor.name}
                    </span>
                    {donor.date && (
                      <div className="text-xs text-gray-500">{donor.date}</div>
                    )}
                  </div>
                  <div className="text-blue-600 font-semibold whitespace-nowrap">
                    {donor.amount.toLocaleString()} บาท
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-sm text-gray-600 mt-6">
        การบริจาคของคุณจะช่วยให้เราสามารถพัฒนาโปรเจกต์นี้อย่างต่อเนื่อง
        <br />
        ขอขอบคุณสำหรับการสนับสนุนของคุณ 🙏
      </p>
    </div>
  );
};

export default Donate;
