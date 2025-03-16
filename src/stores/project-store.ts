import { create } from "zustand";

interface ProjectStore {
  projectName: string;
  setProjectName: (projectName: string) => void;
}

const useProjectStore = create<ProjectStore>((set, get) => ({
  projectName: "untitled",
  setProjectName: (projectName: string) =>
    set((state) => ({
      projectName,
    })),
}));

export default useProjectStore;
