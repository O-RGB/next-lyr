import ButtonCommon from "@/components/button/button";
import React from "react";
import { FaFile } from "react-icons/fa";

interface MidExportProps {}

const MidExport: React.FC<MidExportProps> = ({}) => {
  return (
    <>
      <ButtonCommon
        // disabled={!songDetail}
        // onClick={loadLyr}
        icon={<FaFile></FaFile>}
      >
        .mid
      </ButtonCommon>
    </>
  );
};

export default MidExport;
