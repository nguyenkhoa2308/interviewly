export type InterviewType =
    'HR' | 'BEHAVIORAL' | 'TECHNICAL' | 'CODING' | 'SYSTEM_DESIGN' | 'FULL';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'ADAPTIVE';
export interface InterviewCvOption {
    id: string;
    name: string;
    originalFilename: string;
    fileSize: number | null;
    isDefault: boolean;
    updatedAt: string;
    analysis: {
        detectedRole: string | null;
        detectedLevel: string | null;
        extractedSkills: Array<{ name?: string; category?: string }> | null;
        workExperiences: unknown[] | null;
        projects: unknown[] | null;
        education: Array<{ institution?: string; degree?: string }> | null;
    };
}
export interface InterviewJobOption {
    id: string;
    title: string;
    company: string | null;
    updatedAt: string;
    analysis: {
        detectedRole: string | null;
        seniority: string | null;
        requiredSkills: string[] | null;
        preferredSkills: string[] | null;
        interviewFocus: string[] | null;
    };
}
export interface InterviewOptions {
    cvs: InterviewCvOption[];
    jobDescriptions: InterviewJobOption[];
    matches: Array<{
        id: string;
        cvId: string;
        jobDescriptionId: string;
        matchScore: number | null;
        strengths: Array<{ title?: string; description?: string }> | null;
        gaps: Array<{ title?: string; description?: string }> | null;
        createdAt: string;
    }>;
    defaults: {
        targetRole: string | null;
        targetLevel: string | null;
        interviewType: InterviewType;
        difficulty: Difficulty;
        durationMinutes: 15 | 30 | 45 | 60;
    };
}
export interface InterviewPlanData {
    summary: string;
    openingStrategy: string;
    difficultyStrategy: string;
    sections: Array<{
        title: string;
        objective: string;
        durationMinutes: number;
        questions: Array<{
            order: number;
            type:
                | 'GENERAL'
                | 'TECHNICAL'
                | 'PROJECT'
                | 'BEHAVIORAL'
                | 'CANDIDATE';
            topic: string;
            priority?: 'KEY' | 'HIGH' | 'MEDIUM' | 'LOW';
            expectedDepth?:
                'FOUNDATION' | 'PRACTICAL' | 'TRADE_OFF' | 'ARCHITECTURE';
            evidenceObjectives?: string[];
            probeAreas?: string[];
            objective: string;
            difficulty: 'EASY' | 'MEDIUM' | 'HARD' | null;
            suggestedQuestion: string;
            reasonToAsk: string | null;
            sourceEvidence: Array<{ source: string; reference: string }>;
            expectedSignals: string[];
            followUpStrategy: {
                ifShallow: string | null;
                ifStrong: string | null;
                maxDepth: number;
            };
        }>;
    }>;
    strengthsToValidate: string[];
    gapsToProbe: string[];
    projectAreasToExplore: string[];
    behavioralCompetencies: string[];
    technicalCompetencies: string[];
    adaptationGuidance: string[];
}
export interface Interview {
    id: string;
    status: string;
    interviewType: InterviewType;
    difficulty: Difficulty;
    durationMinutes: number;
    questionCount: number;
    focusAreas: string[];
    targetRole: string;
    targetLevel: string | null;
    createdAt: string;
    cv: { id: string; name: string };
    jobDescription: { id: string; title: string; company: string | null };
    plans: Array<{
        id: string;
        version: number;
        status: string;
        summary: string;
        planData: InterviewPlanData;
        modelProvider: string;
        modelName: string;
        promptVersion: string;
        createdAt: string;
        completedAt: string;
    }>;
}
export interface CreateInterviewPayload {
    saveAsDraft?: boolean;
    previewToken?: string;
    cvId: string;
    jobDescriptionId: string;
    cvJdMatchId?: string;
    interviewType: InterviewType;
    difficulty: Difficulty;
    durationMinutes: 15 | 30 | 45 | 60;
    questionCount: number;
    focusAreas: string[];
    targetRole: string;
    targetLevel?: string | null;
}

export interface InterviewPlanPreview {
    planData: InterviewPlanData;
    metadata: {
        modelProvider: string;
        modelName: string;
        promptVersion: string;
    };
    previewToken: string;
}

export type InterviewStatus =
    'DRAFT' | 'PLANNING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type InterviewListSort = 'RECENTLY_UPDATED' | 'NEWEST' | 'OLDEST';

export interface InterviewListItem {
    id: string;
    status: InterviewStatus;
    interviewType: InterviewType;
    difficulty: Difficulty;
    durationMinutes: number;
    questionCount: number;
    targetRole: string;
    targetLevel: string | null;
    createdAt: string;
    updatedAt: string;
    cv: { id: string; name: string };
    jobDescription: {
        id: string;
        title: string;
        company: string | null;
    };
    plans: Array<{ summary: string | null; version: number }>;
}

export interface InterviewListResponse {
    items: InterviewListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface InterviewRuntimeState {
    interview: {
        id: string;
        status: InterviewStatus;
        interviewType: InterviewType;
        targetRole: string;
        targetLevel: string | null;
        durationMinutes: number;
        focusAreas: string[];
    };
    session: {
        id: string;
        planId: string;
        planVersion: number;
        startedAt: string;
        completedAt: string | null;
    } | null;
    currentTurn: {
        id: string;
        ordinal: number;
        sectionIndex: number;
        sectionTitle: string;
        questionType: InterviewPlanData['sections'][number]['questions'][number]['type'];
        questionText: string;
    } | null;
    transcript: Array<{
        id: string;
        ordinal: number;
        sectionTitle: string;
        questionText: string;
        answerText: string;
        answeredAt: string;
    }>;
    progress: {
        currentSection: string | null;
        sectionNumber: number;
        totalSections: number;
    };
    processing: boolean;
    completed: boolean;
}

export interface SubmitInterviewAnswerPayload {
    turnId: string;
    answer: string;
}

export type InterviewEvaluationStatus =
    'NOT_STARTED' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type InterviewReviewSection =
    | {
          type: 'CRITERIA_ANALYSIS';
          title: string;
          order?: number;
          data: {
              criteria: Array<{
                  id?: string;
                  name: string;
                  status:
                      | 'DEMONSTRATED'
                      | 'PARTIALLY_DEMONSTRATED'
                      | 'NOT_DEMONSTRATED'
                      | 'INCORRECT'
                      | 'INSUFFICIENT_EVIDENCE';
                  evidence: string | null;
                  missing: string | null;
                  explanation?: string | null;
              }>;
              overallAssessment: string;
          };
      }
    | {
          type: 'ANSWER_STRUCTURE';
          title: string;
          order?: number;
          data: {
              steps: Array<{
                  label: string;
                  guidance: string;
                  expectedContent?: string | null;
                  speakingTimeSeconds?: number | null;
              }>;
          };
      }
    | {
          type: 'KNOWLEDGE_EXPLANATION';
          title: string;
          order?: number;
          data: {
              explanation: string;
              concepts?: string[];
              keyPoints: string[];
              examples?: string[];
              caveats?: string[];
              commonMisconception: string | null;
          };
      }
    | {
          type: 'CODE_EXAMPLE';
          title: string;
          order?: number;
          data: {
              language: string;
              code: string;
              explanation: string;
              expectedBehavior?: string | null;
          };
      }
    | {
          type: 'SCENARIO_APPROACH';
          title: string;
          order?: number;
          data: {
              steps: Array<{ label: string; detail: string }>;
              reasoning?: string | null;
              alternatives?: Array<{ option: string; whenToUse: string }>;
              validation: string | null;
          };
      }
    | {
          type: 'TRADEOFF_ANALYSIS';
          title: string;
          order?: number;
          data: {
              options: Array<{
                  name: string;
                  advantages: string[];
                  disadvantages: string[];
                  whenToUse: string;
              }>;
              decisionCriteria?: string[];
              recommendation: string | null;
          };
      }
    | {
          type: 'STAR_ANALYSIS';
          title: string;
          order?: number;
          data: {
              situation: string | null;
              task: string | null;
              action: string | null;
              result: string | null;
              missingParts: Array<'SITUATION' | 'TASK' | 'ACTION' | 'RESULT'>;
              contentSource?: 'CANDIDATE_EVIDENCE' | 'GUIDANCE_PLACEHOLDER';
          };
      }
    | {
          type: 'INTERVIEWER_PERSPECTIVE';
          title: string;
          order?: number;
          data: {
              positiveSignals: string[];
              concerns: string[];
              likelyFollowUps: string[];
          };
      }
    | {
          type: 'IMPROVED_ANSWER';
          title: string;
          order?: number;
          data: {
              answer: string;
              answerType?:
                  'PERSONALIZED_VERIFIED' | 'ILLUSTRATIVE' | 'TEMPLATE';
              improvements?: string[];
          };
      }
    | {
          type: 'ANSWER_COMPARISON';
          title: string;
          order?: number;
          data: {
              originalAnswer?: string | null;
              improvedAnswer?: string | null;
              changes: Array<{
                  area: string;
                  original: string | null;
                  improved: string;
                  reason: string;
              }>;
              summary: string;
          };
      }
    | {
          type: 'SCENARIO_ANALYSIS';
          title: string;
          order?: number;
          data: {
              approach: string;
              considerations: string[];
              tradeOffs: string[];
          };
      };
export interface InterviewEvaluationReport {
    schemaVersion?: 1 | 2;
    overallSummary: string;
    overallScore: number | null;
    coverage: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    levelAssessment:
        | 'ABOVE_EXPECTATIONS'
        | 'MEETS_EXPECTATIONS'
        | 'PARTIALLY_MEETS_EXPECTATIONS'
        | 'BELOW_EXPECTATIONS'
        | 'INSUFFICIENT_EVIDENCE';
    demonstratedStrengths: string[];
    competencies: Array<{
        competencyKey: string;
        name: string;
        priority: 'KEY' | 'HIGH' | 'MEDIUM' | 'LOW';
        score: number | null;
        coverageStatus:
            'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT' | 'NOT_ASSESSED';
        confidence: 'HIGH' | 'MEDIUM' | 'LOW';
        summary: string;
        strengths: string[];
        weaknesses: string[];
        evidenceTurnIds: string[];
    }>;
    diagnosticFindings: Array<{
        id: string;
        competencyKey: string;
        subarea: string;
        category:
            | 'KNOWLEDGE_GAP'
            | 'MISCONCEPTION'
            | 'SHALLOW_UNDERSTANDING'
            | 'APPLICATION_GAP'
            | 'PROBLEM_SOLVING_GAP'
            | 'EXPERIENCE_GAP'
            | 'COMMUNICATION_GAP';
        evidenceStatus:
            | 'DEMONSTRATED_GAP'
            | 'PARTIALLY_DEMONSTRATED'
            | 'INSUFFICIENT_EVIDENCE'
            | 'NOT_ASSESSED';
        severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
        observation: string;
        expectedUnderstanding: string;
        explanation: string;
        evidenceTurnIds: string[];
        improvementAction: string;
        suggestedPractice: string;
    }>;
    answerReviews: Array<{
        turnId: string;
        questionText: string;
        answerText: string;
        probeType: 'MAIN_TARGET_LEVEL' | 'SAME_LEVEL_PROBE' | 'STRETCH_PROBE';
        scoringImpact: 'TARGET_LEVEL' | 'BONUS_ONLY';
        competencyKey: string | null;
        answerStatus?:
            | 'ANSWERED'
            | 'PARTIAL'
            | 'DONT_KNOW'
            | 'REFUSED'
            | 'OFF_TOPIC'
            | 'NO_RESPONSE';
        questionObjective?: string;
        evidenceQuotes?: string[];
        learningObjectives?: string[];
        sectionIndex?: number;
        sectionTitle?: string;
        questionType?:
            'GENERAL' | 'TECHNICAL' | 'PROJECT' | 'BEHAVIORAL' | 'CANDIDATE';
        topic?: string | null;
        correctAspects: string[];
        missingAspects: string[];
        incorrectAspects: string[];
        whyItMatters: string;
        improvement: string;
        exampleImprovedAnswer: string | null;
        exampleImprovedAnswerType?:
            'PERSONALIZED_VERIFIED' | 'ILLUSTRATIVE' | 'TEMPLATE' | null;
        reviewSections?: InterviewReviewSection[];
    }>;
    recommendations: Array<{
        competencyKey: string;
        priority: 'KEY' | 'HIGH' | 'MEDIUM' | 'LOW';
        topic: string;
        reason: string;
        learningObjectives: string[];
        suggestedExercises: string[];
        expectedOutcome: string;
        relatedFindingIds: string[];
    }>;
    unassessedAreas: Array<{
        competencyKey: string;
        name: string;
        reason: string;
    }>;
    stretchAchievements: string[];
    generatedAt: string;
    rubricVersion: string;
}
export interface InterviewQuestionReviewsResponse {
    interviewId: string;
    status: Exclude<InterviewEvaluationStatus, 'NOT_STARTED'>;
    reviews: {
        schemaVersion: 1;
        answerReviews: InterviewEvaluationReport['answerReviews'];
    } | null;
    errorCode?: string | null;
    canRetry: boolean;
    attemptCount: number;
    completedAt?: string | null;
    updatedAt?: string;
}

export interface InterviewEvaluationResponse {
    interviewId: string;
    status: InterviewEvaluationStatus;
    report: InterviewEvaluationReport | null;
    errorCode?: string | null;
    canRetry: boolean;
    attemptCount: number;
    completedAt?: string | null;
    updatedAt?: string;
    questionReview?: {
        status: Exclude<InterviewEvaluationStatus, 'NOT_STARTED'>;
        data: InterviewQuestionReviewsResponse['reviews'];
        errorCode?: string | null;
        attemptCount: number;
        completedAt?: string | null;
    };
}

export type InterviewHistorySort =
    'RECENT' | 'OLDEST' | 'HIGHEST_SCORE' | 'LOWEST_SCORE';

export interface InterviewHistoryFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: InterviewStatus;
    role?: string;
    level?: string;
    interviewType?: InterviewType;
    from?: string;
    to?: string;
    sort?: InterviewHistorySort;
}

export interface InterviewHistoryItem {
    id: string;
    status: InterviewStatus;
    interviewType: InterviewType;
    difficulty: Difficulty;
    durationMinutes: number;
    questionCount: number;
    targetRole: string;
    targetLevel: string | null;
    createdAt: string;
    updatedAt: string;
    cv: { id: string; name: string };
    jobDescription: {
        id: string;
        title: string;
        company: string | null;
    };
    session: {
        id: string;
        startedAt: string;
        completedAt: string | null;
        turnCount: number;
    } | null;
    evaluation: {
        status: Exclude<InterviewEvaluationStatus, 'NOT_STARTED'>;
        overallScore: number | null;
        coverage: number | null;
        confidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
        levelAssessment: InterviewEvaluationReport['levelAssessment'] | null;
        rubricVersion: string;
        completedAt: string | null;
    } | null;
}

export interface InterviewHistoryResponse {
    items: InterviewHistoryItem[];
    pagination: InterviewListResponse['pagination'];
}

export interface InterviewTranscriptResponse {
    interview: {
        id: string;
        status: InterviewStatus;
        targetRole: string;
        targetLevel: string | null;
        interviewType: InterviewType;
        durationMinutes: number;
        createdAt: string;
    };
    session: {
        id: string;
        startedAt: string;
        completedAt: string | null;
    } | null;
    evaluation: {
        status: Exclude<InterviewEvaluationStatus, 'NOT_STARTED'>;
        completedAt: string | null;
    } | null;
    turns: Array<{
        id: string;
        runtimeOrder: number;
        sectionIndex: number;
        sectionTitle: string;
        questionType: string;
        topic: string | null;
        questionText: string;
        answerText: string | null;
        answeredAt: string | null;
        feedback: {
            answerStatus?:
                | 'ANSWERED'
                | 'PARTIAL'
                | 'DONT_KNOW'
                | 'REFUSED'
                | 'OFF_TOPIC'
                | 'NO_RESPONSE';
            questionObjective?: string;
            evidenceQuotes?: string[];
            learningObjectives?: string[];
            correctAspects: string[];
            missingAspects: string[];
            incorrectAspects: string[];
            whyItMatters: string;
            improvement: string;
            exampleImprovedAnswer: string | null;
            reviewSections?: InterviewReviewSection[];
        } | null;
    }>;
}

export interface InterviewProgressFilters {
    role?: string;
    level?: string;
    interviewType?: InterviewType;
    from?: string;
    to?: string;
}

export interface InterviewProgressResponse {
    summary: {
        completedInterviewCount: number;
        evaluatedInterviewCount: number;
        comparableInterviewCount: number;
        latestScore: number | null;
        averageCoverage: number | null;
    };
    activeComparison: {
        key: string;
        role: string;
        level: string | null;
        interviewType: InterviewType;
        rubricVersion: string;
    } | null;
    comparisonGroups: Array<{
        key: string;
        role: string;
        level: string | null;
        interviewType: InterviewType;
        rubricVersion: string;
        count: number;
    }>;
    overallSeries: Array<{
        interviewId: string;
        score: number;
        coverage: number | null;
        confidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
        date: string | null;
    }>;
    competencySeries: Array<{
        competencyKey: string;
        name: string;
        points: Array<{
            interviewId: string;
            score: number;
            date: string | null;
            coverageStatus: string;
            confidence: string;
        }>;
    }>;
    recurringWeaknesses: Array<{
        competencyKey: string;
        subarea: string;
        category: string;
        occurrences: Array<{
            interviewId: string;
            date: string | null;
            severity: string;
            observation: string;
        }>;
    }>;
    limitations: string[];
}
