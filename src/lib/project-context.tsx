"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  getAllProjects,
  createProject as createStoreProject,
  updateProject as updateStoreProject,
  deleteProject as deleteStoreProject,
  getCurrentProjectId,
  setCurrentProjectId,
  type Project,
} from "@/lib/project-store";

interface ProjectContextValue {
  projects: Project[];
  currentProjectId: string | null;
  currentProject: Project | null;
  setCurrentProject: (id: string | null) => void;
  createProject: (name: string, description?: string) => Project;
  updateProject: (
    id: string,
    updates: Partial<Pick<Project, "name" | "description" | "color">>
  ) => Project | null;
  deleteProject: (id: string) => void;
  refreshProjects: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(null);

  const refreshProjects = useCallback(() => {
    setProjects(getAllProjects());
    setCurrentProjectIdState(getCurrentProjectId());
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const currentProject =
    currentProjectId !== null
      ? projects.find((p) => p.id === currentProjectId) || null
      : null;

  // If current project was deleted, clear it
  useEffect(() => {
    if (currentProjectId && !currentProject) {
      setCurrentProjectId(null);
      setCurrentProjectIdState(null);
    }
  }, [currentProjectId, currentProject]);

  const setCurrentProject = useCallback((id: string | null) => {
    setCurrentProjectId(id);
    setCurrentProjectIdState(id);
  }, []);

  const createProject = useCallback(
    (name: string, description?: string): Project => {
      const project = createStoreProject(name, description);
      refreshProjects();
      return project;
    },
    [refreshProjects]
  );

  const updateProject = useCallback(
    (
      id: string,
      updates: Partial<Pick<Project, "name" | "description" | "color">>
    ) => {
      const result = updateStoreProject(id, updates);
      refreshProjects();
      return result;
    },
    [refreshProjects]
  );

  const deleteProjectFn = useCallback(
    (id: string) => {
      deleteStoreProject(id);
      refreshProjects();
    },
    [refreshProjects]
  );

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProjectId,
        currentProject,
        setCurrentProject,
        createProject,
        updateProject,
        deleteProject: deleteProjectFn,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return ctx;
}
