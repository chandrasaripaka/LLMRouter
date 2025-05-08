// services/task-classifier.ts
  
import { TaskComplexity } from '../models/types';
  
export class TaskClassifier {
  private complexityPatterns: Record<TaskComplexity, RegExp[]> = {
    [TaskComplexity.SIMPLE]: [
      /what is|who is|when|where|can you|could you/i,
      /hello|hi there|good morning|help me/i,
      /simple|basic|quick|short/i
    ],
    [TaskComplexity.MODERATE]: [
      /explain|describe|compare|contrast|summarize/i,
      /how to|how do I|steps to|process of/i,
      /analyze the|provide feedback|what are the implications/i
    ],
    [TaskComplexity.COMPLEX]: [
      /design a|create a comprehensive|develop a strategy/i,
      /ethical implications|philosophical|theoretical|conceptual/i,
      /critique|evaluate the merits|assess the validity/i,
      /research|investigate|deep dive/i,
      /complex|complicated|advanced|sophisticated/i
    ]
  };

  private taskLengthThresholds = {
    [TaskComplexity.SIMPLE]: 50,    // words
    [TaskComplexity.MODERATE]: 150  // anything above is COMPLEX
  };

  classifyTask(prompt: string): TaskComplexity {
    // Count words in the prompt
    const wordCount = prompt.split(/\s+/).length;
    
    // Check for complexity based on patterns
    for (const [complexity, patterns] of Object.entries(this.complexityPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(prompt)) {
          return complexity as TaskComplexity;
        }
      }
    }
    
    // If no patterns matched, classify based on length
    if (wordCount <= this.taskLengthThresholds[TaskComplexity.SIMPLE]) {
      return TaskComplexity.SIMPLE;
    } else if (wordCount <= this.taskLengthThresholds[TaskComplexity.MODERATE]) {
      return TaskComplexity.MODERATE;
    } else {
      return TaskComplexity.COMPLEX;
    }
  }
}