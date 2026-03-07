export interface TaskSummary {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  estimated_time: string;
  components: string[];
  step_count: number;
  cv_tools?: string[];
}

export interface TaskStep {
  step: number;
  instruction: string;
  visual_cue: string;
  common_errors: string[];
  during_action_cues?: string[];
}

export interface TaskDetail extends TaskSummary {
  steps: TaskStep[];
}
