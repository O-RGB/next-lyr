import { Heart, HeartHandshake } from "lucide-react";
import React, { useEffect, useState } from "react";
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
    <div className="p-4 max-w-5xl mx-auto text-foreground">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center bg-raised p-2 rounded-full mb-2">
          <HeartHandshake className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-primary mb-1">
          ช่วยสนับสนุนเรา
        </h2>
        <p className="text-sm text-foreground max-w-xl mx-auto">
          การสนับสนุนของคุณช่วยให้นักพัฒนามีกำลังใจพัฒนาโปรเจกต์ต่อไป
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-start justify-center gap-4">
        <div className="bg-panel rounded-xl border border-line p-4 w-full lg:w-1/2">
          <div className="relative rounded-md flex flex-col items-center">
            <div className="absolute top-2 right-2 bg-raised rounded-full px-2 py-1 text-xs text-primary font-medium">
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
          <div className="bg-panel rounded-xl border border-line p-4 w-full lg:w-1/2">
            <div className="text-center mb-2">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Heart className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-primary">
                  ผู้สนับสนุน
                </h3>
              </div>
              <div className="text-xs text-muted-foreground mb-1">กรกฎาคม 2568</div>
              <div className="text-sm font-semibold text-primary mb-2">
                ยอดรวม {totalDonations.toLocaleString()} บาท
              </div>
              <div className="w-full h-2 bg-raised rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-primary rounded-full"
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
                  className="flex justify-between items-center bg-panel-2 hover:bg-raised transition-all rounded px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-primary">
                      {donor.name}
                    </span>
                    {donor.date && (
                      <div className="text-xs text-muted-foreground">{donor.date}</div>
                    )}
                  </div>
                  <div className="text-primary font-semibold whitespace-nowrap">
                    {donor.amount.toLocaleString()} บาท
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-sm text-foreground mt-6">
        การบริจาคของคุณจะช่วยให้เราสามารถพัฒนาโปรเจกต์นี้อย่างต่อเนื่อง
        <br />
        ขอขอบคุณสำหรับการสนับสนุนของคุณ 🙏
      </p>
    </div>
  );
};

export default Donate;
