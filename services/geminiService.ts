
import { GoogleGenAI, Type } from "@google/genai";
import { CareerRecommendation, CareerDetails, RoadmapStep, Job, AdvancedFormData, SkillDetail, InterviewQuestion, QuizQuestion, QuizRecommendation } from "../types";

// NOTE: In a real production app, ensure process.env.API_KEY is set.
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY
});
// Existing basic recommendation function
export const generateRecommendations = async (
  classLevel: string,
  stream: string,
  marks: number
): Promise<CareerRecommendation[]> => {
  const prompt = `Based on the following student profile, suggest 5 suitable career paths: Class: ${classLevel}, Stream: ${stream}, Marks: ${marks}%. 
  For each career, provide a 'title' (the career name) and an 'imageTag' (a single, simple English word best for searching a stock photo, e.g., "coding", "data", "law", "medical", "design").`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            careers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  imageTag: { type: Type.STRING },
                },
                required: ["title", "imageTag"],
              },
            },
          },
          required: ["careers"],
        },
      },
    });

    const json = JSON.parse(response.text || "{}");
    return json.careers || [];
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return [];
  }
};

// NEW: Advanced Recommendation Function
export const generateAdvancedRecommendations = async (data: AdvancedFormData): Promise<CareerRecommendation[]> => {
  const prompt = `A student is seeking career advice. Profile:
      - Level: ${data.classLevel}, Stream: ${data.stream || 'N/A'}, Marks: ${data.marks || 'N/A'}%
      - Interests: ${data.interests.join(', ')}
      - Strengths: ${data.strengths.join(', ')}
      - Goal: Find a ${data.goal}
      Provide 3 diverse, actionable recommendations. For each, give a very concise title that is only the name of the job or field of study. Then, provide a detailed 2-4 sentence description explaining the path and why it fits the user. Also provide an imageTag.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { 
                    title: { type: Type.STRING }, 
                    description: { type: Type.STRING },
                    imageTag: { type: Type.STRING }
                },
                required: ["title", "description", "imageTag"]
              }
            }
          },
          required: ["recommendations"]
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    return json.recommendations || [];
  } catch (error) {
    console.error("Error generating advanced recommendations:", error);
    return [];
  }
};

export const generateSkillDetails = async (careerTitle: string): Promise<{ technical: SkillDetail[], soft: SkillDetail[] } | null> => {
    const prompt = `For a career as a "${careerTitle}", list the top 5 technical skills and top 3 soft skills. For each skill, provide a "name" and a one-sentence "explanation".`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        technical: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { name: { type: Type.STRING }, explanation: { type: Type.STRING } },
                                required: ["name", "explanation"]
                            }
                        },
                        soft: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { name: { type: Type.STRING }, explanation: { type: Type.STRING } },
                                required: ["name", "explanation"]
                            }
                        }
                    },
                    required: ["technical", "soft"]
                }
            }
        });
        return JSON.parse(response.text || "null");
    } catch (error) {
        console.error("Error generating skills:", error);
        return null;
    }
};

export const generateInterviewQuestions = async (careerTitle: string): Promise<InterviewQuestion[] | null> => {
    const prompt = `Generate 5 common interview questions for an entry-level position for "${careerTitle}". For each, provide a "question" and a detailed "answer_explanation" on how to structure the answer.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                     type: Type.OBJECT,
                     properties: {
                         questions: {
                             type: Type.ARRAY,
                             items: {
                                 type: Type.OBJECT,
                                 properties: {
                                     question: { type: Type.STRING },
                                     answer_explanation: { type: Type.STRING }
                                 },
                                 required: ["question", "answer_explanation"]
                             }
                         }
                     },
                     required: ["questions"]
                 }
            }
        });
        const res = JSON.parse(response.text || "{}");
        return res.questions || [];
    } catch (error) {
        console.error("Error generating interview questions:", error);
        return null;
    }
}

export const generateCareerDetails = async (
  careerName: string
): Promise<CareerDetails | null> => {
  const prompt = `Provide a detailed career overview for "${careerName}". Return a JSON object with: "title" (exact match), "description" (3-4 sentences), and "skills" (array of 7-8 skills).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["title", "description", "skills"],
        },
      },
    });

    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Error generating details:", error);
    return null;
  }
};

export const generateRoadmap = async (
  careerName: string
): Promise<RoadmapStep[]> => {
  const prompt = `Create a detailed, step-by-step roadmap for a beginner to become a "${careerName}". Provide 4-6 milestones. For each, give a "title", a "duration", and a brief "description".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roadmap: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["title", "duration", "description"],
              },
            },
          },
          required: ["roadmap"],
        },
      },
    });

    const json = JSON.parse(response.text || "{}");
    return json.roadmap || [];
  } catch (error) {
    console.error("Error generating roadmap:", error);
    return [];
  }
};

export const generateJobs = async (careerName: string): Promise<Job[]> => {
  const prompt = `Generate a list of 10 fictional but realistic job opportunities for a "${careerName}".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            jobs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  jobTitle: { type: Type.STRING },
                  companyName: { type: Type.STRING },
                },
                required: ["jobTitle", "companyName"],
              },
            },
          },
          required: ["jobs"],
        },
      },
    });

    const json = JSON.parse(response.text || "{}");
    return json.jobs || [];
  } catch (error) {
    console.error("Error generating jobs:", error);
    return [];
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
    // Using gemini-2.5-flash-image for image generation as per guidance
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: `A professional, high-quality photograph representing ${prompt}. Minimalist, blue and white theme.` }]
            },
             config: {
                imageConfig: {
                    aspectRatio: "1:1",
                }
             }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (error) {
        console.error("Error generating image:", error);
        return null;
    }
}

// --- QUIZ & CHILD ABILITY ---

export const generateQuizQuestions = async (studentContext: string): Promise<QuizQuestion[]> => {
    const prompt = `${studentContext}. Based on this, create 30 unique multiple-choice questions for a career aptitude test. 
    The questions must be in 5 sets of 6 questions each, covering: English, Math, Science, Social Science (or related subjects based on stream), and Aptitude. 
    Return a JSON array where each object has: "question" (string), "options" (array of 4 strings), and "correctAnswerIndex" (integer 0-3).`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: { type: Type.STRING },
                                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    correctAnswerIndex: { type: Type.INTEGER }
                                },
                                required: ["question", "options", "correctAnswerIndex"]
                            }
                        }
                    },
                    required: ["questions"]
                }
            }
        });

        const json = JSON.parse(response.text || "{}");
        return json.questions || [];
    } catch (error) {
        console.error("Error generating quiz questions:", error);
        return [];
    }
};

export const generateQuizBasedRecommendations = async (
    questions: QuizQuestion[],
    userAnswers: (number | null)[],
    classLevel: string,
    stream: string,
    pathType: 'jobs' | 'studies',
    timeTaken: string
): Promise<QuizRecommendation[]> => {
    // 1. Analyze Answers to find Strengths/Weaknesses
    let answerSummary = "User Answers Analysis:\n";
    let correctCount = 0;
    
    questions.forEach((q, i) => {
        const userAnswer = userAnswers[i];
        if (userAnswer === q.correctAnswerIndex) {
            correctCount++;
            answerSummary += `Q${i+1}: Correct (${q.question.substring(0, 30)}...)\n`;
        } else if (userAnswer === null) {
            answerSummary += `Q${i+1}: Skipped\n`;
        } else {
            answerSummary += `Q${i+1}: Incorrect\n`;
        }
    });

    const scorePercentage = (correctCount / questions.length) * 100;
    const promptType = pathType === 'jobs' ? 'job and career paths' : 'fields for higher studies';

    const prompt = `
        Analyze the following student's aptitude test performance.
        Profile: Class ${classLevel} ${stream ? `(${stream})` : ''}.
        Performance: Score ${scorePercentage.toFixed(1)}%, Time Taken: ${timeTaken}.
        
        ${answerSummary}

        Based on their answering pattern (identifying strong/weak topics) and implicit IQ from the score/time ratio, recommend the top 3 ${promptType}. 
        For each, provide:
        1. "title": The name of the path.
        2. "description": Why this fits their specific performance (2-3 sentences).
        3. "imagePrompt": A creative, professional image prompt to visually represent this path (for AI generation).
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recommendations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    imagePrompt: { type: Type.STRING }
                                },
                                required: ["title", "description", "imagePrompt"]
                            }
                        }
                    },
                    required: ["recommendations"]
                }
            }
        });

        const json = JSON.parse(response.text || "{}");
        return json.recommendations || [];
    } catch (error) {
        console.error("Error generating quiz recommendations:", error);
        return [];
    }
};

// --- Child Aptitude Test Methods ---

export const generateChildAptitudeTest = async (classLevel: string, type: 'General' | 'Specific', specifics?: string): Promise<any[]> => {
    let prompt = '';
    if (type === 'General') {
        prompt = `Create a 20-question general aptitude test for a child in class ${classLevel}. The test should assess potential in logical reasoning, verbal ability, numerical reasoning, spatial awareness, and creativity. All questions must be multiple-choice questions (MCQs) with 4 options.`;
    } else {
        prompt = `Create a 20-question aptitude test for a child in class ${classLevel} to assess their suitability for the career/field of: ${specifics}. The questions should be age-appropriate and test for relevant skills like problem-solving, critical thinking, and specific knowledge areas where applicable. All questions must be multiple-choice questions (MCQs) with 4 options.`;
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: { type: Type.STRING },
                                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    correctAnswerIndex: { type: Type.INTEGER }
                                },
                                required: ["question", "options", "correctAnswerIndex"]
                            }
                        }
                    },
                    required: ["questions"]
                }
            }
        });
        const json = JSON.parse(response.text || "{}");
        return json.questions || [];
    } catch (error) {
        console.error("Error generating child aptitude test:", error);
        return [];
    }
};

export const analyzeChildAptitude = async (answers: any[], classLevel: string, type: 'General' | 'Specific', specifics?: string, iqScore?: number): Promise<any> => {
    let prompt = '';
    if (type === 'General') {
        prompt = `Based on the following test answers from a child in class ${classLevel} (Estimated IQ: ${iqScore || 'N/A'}), analyze their performance. 
        Provide:
        1. A detailed SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) based on their answers.
        2. A detailed, personalized teaching plan on how to teach this student without straining them, considering their class level and estimated IQ.
        3. Five distinct and suitable career paths (study and job) with a brief reason for each.
        
        The answers are: ${JSON.stringify(answers)}. 
        
        Return a JSON object with the following structure:
        {
            "swot": {
                "strengths": ["...", "..."],
                "weaknesses": ["...", "..."],
                "opportunities": ["...", "..."],
                "threats": ["...", "..."]
            },
            "teachingPlan": "A detailed paragraph explaining the teaching strategy...",
            "suggestions": [
                { "career": "...", "reason": "..." }
            ]
        }`;
        
        try {
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            swot: {
                                type: Type.OBJECT,
                                properties: {
                                    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    threats: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ["strengths", "weaknesses", "opportunities", "threats"]
                            },
                            teachingPlan: { type: Type.STRING },
                            suggestions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        career: { type: Type.STRING },
                                        reason: { type: Type.STRING }
                                    },
                                    required: ["career", "reason"]
                                }
                            }
                        },
                        required: ["swot", "teachingPlan", "suggestions"]
                    }
                }
            });
            return JSON.parse(response.text || "{}");
        } catch (e) { console.error(e); return null; }

    } else {
        prompt = `Based on the following test answers from a child in class ${classLevel} (Estimated IQ: ${iqScore || 'N/A'}), provide a detailed aptitude analysis for the career of ${specifics}. 
        Provide:
        1. A detailed SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) relevant to this career.
        2. A detailed, personalized teaching plan on how to teach this student without straining them, considering their class level and estimated IQ.
        3. A detailed paragraph analysis and a summary verdict (e.g., "High Potential", "Moderate Fit").
        
        The answers are: ${JSON.stringify(answers)}. 
        
        Return a JSON object with the following structure:
        {
            "swot": {
                "strengths": ["...", "..."],
                "weaknesses": ["...", "..."],
                "opportunities": ["...", "..."],
                "threats": ["...", "..."]
            },
            "teachingPlan": "A detailed paragraph explaining the teaching strategy...",
            "analysis": "A detailed paragraph...",
            "verdict": "Summary conclusion..."
        }`;
        
        try {
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            swot: {
                                type: Type.OBJECT,
                                properties: {
                                    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    threats: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ["strengths", "weaknesses", "opportunities", "threats"]
                            },
                            teachingPlan: { type: Type.STRING },
                            analysis: { type: Type.STRING },
                            verdict: { type: Type.STRING }
                        },
                        required: ["swot", "teachingPlan", "analysis", "verdict"]
                    }
                }
            });
            return JSON.parse(response.text || "{}");
        } catch (e) { console.error(e); return null; }
    }
};

export const explainTopic = async (topic: string): Promise<string | null> => {
  const systemInstruction = `You are an expert AI Study Assistant. Your goal is to provide clear, concise, and beautifully formatted explanations of educational topics for students. When a user asks for a topic, respond with: 1. A clear title using the format <h3 class="text-lg font-bold text-gray-800 mb-4">Easily Summarize this topic - {Topic Name}</h3>. 2. A simple, easy-to-understand summary of the topic in paragraphs <p>. 3. Use <h4 class="font-semibold text-gray-700 mt-6 mb-2"> for subheadings and <ul class="list-disc list-inside space-y-2"> for key points. Use <strong> to highlight important terms. 4. If the topic is visual (like a scientific process, a structure, or states of matter), generate a simple, clean SVG diagram within a <div class="my-6 p-4 bg-gray-100 rounded-lg text-center"> to illustrate the concept. Do not use complex SVG paths; stick to basic shapes like <rect>, <circle>, <line>, <text>, and simple <path> for arrows. The SVG should be clear and helpful. 5. Keep the entire response within a single block of valid HTML. Do not wrap the response in markdown code fences.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explain the topic: ${topic}`,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    
    let text = response.text || "";
    // Clean up potential markdown code blocks
    text = text.replace(/^```html\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
    
    return text || null;
  } catch (error) {
    console.error("AI Explanation Error:", error);
    return null;
  }
};

// --- SPORTS ACADEMY METHODS ---

export const getAcademyRoadmap = async (sport: string, academyName: string): Promise<any[] | null> => {
    const prompt = `Generate a typical training roadmap for a ${sport} athlete at an academy like '${academyName}'. The roadmap should be a JSON array of 3-4 objects, where each object has "stage", "description", and "competitions" keys. Keep descriptions concise.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            stage: { type: Type.STRING },
                            description: { type: Type.STRING },
                            competitions: { type: Type.STRING }
                        },
                        required: ["stage", "description", "competitions"]
                    }
                }
            }
        });
        return JSON.parse(response.text || "null");
    } catch (error) {
        console.error("Error generating sports roadmap:", error);
        return null;
    }
};

export const getAcademyFees = async (academyName: string, address: string): Promise<string> => {
    // Requires gemini-3-pro-image-preview for search tool in this SDK version context
    // Or we use gemini-3-pro-preview with tools if strict text
    const prompt = `Search the web for the official fee structure of the academy named "${academyName}" located at "${address}". 
    Provide a comprehensive summary of the fees, coaching rates, and any other relevant costs.
    
    IMPORTANT: Return the response as valid HTML code.
    - Use <h3> for section titles (e.g., "Practice Fees", "Coaching Fees").
    - Use <ul> and <li> for lists of fee items.
    - Use <table> with <thead> and <tbody> for any tabular data like coaching packages (e.g., Coach Level vs Price).
    - Use <strong> for emphasis on prices.
    - Do NOT use Markdown syntax (like **, ###, | table |). Use pure HTML tags only.
    - Ensure tables have a simple class="w-full text-sm text-left text-gray-500 mb-4 border border-gray-200" and cells have padding.
    
    If you cannot find any specific fee information after searching, respond with ONLY the text "NOT_FOUND".`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview", // upgraded for search
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        return response.text || "NOT_FOUND";
    } catch (error) {
        console.error("Error fetching fees:", error);
        return "Could not fetch fee information.";
    }
};

export const getAcademyOverview = async (academyName: string, address: string): Promise<string> => {
    const prompt = `Perform a Google Search to find detailed information about the sports academy named "${academyName}" located at "${address}".
    Provide a comprehensive overview including:
    1. Introduction/About
    2. Key Facilities
    3. Coaching Staff (if available)
    4. Achievements/Reputation
    Format the output in HTML (using <h3>, <p>, <ul>, <li> tags) for clean display. If specific details aren't found, summarize what is available.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        return response.text || "<p>Could not fetch detailed overview at this time.</p>";
    } catch (error) {
        console.error("Error fetching overview:", error);
        return "<p>Could not fetch detailed overview at this time.</p>";
    }
};

// --- BUSINESS BLASTER METHODS ---

export const analyzeBusinessIdea = async (idea: string, problem: string, solution: string): Promise<any> => {
    const prompt = `Perform a deep research analysis for the following business idea. Idea: ${idea}. Problem it solves: ${problem}. Unique solution: ${solution}. Return a JSON object with the following structure: { "ideaTitle": "A concise title for the business idea", "ideaValidation": "A paragraph validating the core concept.", "marketAnalysis": { "summary": "A summary of the market potential and target audience.", "marketSizeData": { "labels": ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"], "data": [/* an array of 5 numbers representing projected market growth in USD millions, e.g., 5, 8, 12, 18, 25 */] } }, "targetAudience": { "personaName": "e.g., 'Eco-Conscious Emily'", "demographics": "Age, location, income, etc.", "painPoints": ["Point 1", "Point 2"], "goals": ["Goal 1", "Goal 2"] }, "competitiveLandscape": [ { "competitor": "Competitor A", "strength": "Their key advantage", "weakness": "Their key disadvantage" }, { "competitor": "Competitor B", "strength": "...", "weakness": "..." }, { "competitor": "Competitor C", "strength": "...", "weakness": "..." } ], "swotAnalysis": { "strengths": ["Strength 1", "Strength 2"], "weaknesses": ["Weakness 1", "Weakness 2"], "opportunities": ["Opportunity 1", "Opportunity 2"], "threats": ["Threat 1", "Threat 2"] }, "uniqueSellingPropositions": ["USP 1", "USP 2", "USP 3"] }`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        ideaTitle: { type: Type.STRING },
                        ideaValidation: { type: Type.STRING },
                        marketAnalysis: {
                            type: Type.OBJECT,
                            properties: {
                                summary: { type: Type.STRING },
                                marketSizeData: {
                                    type: Type.OBJECT,
                                    properties: {
                                        labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        data: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                                    }, required: ["labels", "data"]
                                }
                            }, required: ["summary", "marketSizeData"]
                        },
                        targetAudience: {
                            type: Type.OBJECT,
                            properties: {
                                personaName: { type: Type.STRING },
                                demographics: { type: Type.STRING },
                                painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                                goals: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }, required: ["personaName", "demographics", "painPoints", "goals"]
                        },
                        competitiveLandscape: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    competitor: { type: Type.STRING },
                                    strength: { type: Type.STRING },
                                    weakness: { type: Type.STRING }
                                }, required: ["competitor", "strength", "weakness"]
                            }
                        },
                        swotAnalysis: {
                            type: Type.OBJECT,
                            properties: {
                                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                                opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                                threats: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }, required: ["strengths", "weaknesses", "opportunities", "threats"]
                        },
                        uniqueSellingPropositions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["ideaTitle", "ideaValidation", "marketAnalysis", "targetAudience", "competitiveLandscape", "swotAnalysis", "uniqueSellingPropositions"]
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error(e);
        return null;
    }
};

export const getBusinessGuidance = async (ideaTitle: string): Promise<any> => {
    const prompt = `Create a detailed step-by-step guidance plan for the business idea: "${ideaTitle}". Return a JSON object with the following structure: { "title": "Your Roadmap to Success", "phases": [ { "phaseTitle": "Phase 1: Foundation & Research", "phaseDescription": "A brief summary of this phase.", "timeline": "e.g., Weeks 1-4", "budgetDistribution": { "Marketing": 40, "Development": 50, "Legal": 10 }, "keyTasks": [ { "task": "Task Name", "priority": "High/Medium/Low", "details": "More details about the task." } ], "milestones": ["Milestone 1", "Milestone 2"] }, { "phaseTitle": "Phase 2: Product Development & Branding", "phaseDescription": "...", "timeline": "...", "budgetDistribution": { "Marketing": 30, "Development": 60, "Operations": 10 }, "keyTasks": [...], "milestones": [...] }, { "phaseTitle": "Phase 3: Launch & Growth", "phaseDescription": "...", "timeline": "...", "budgetDistribution": { "Marketing": 70, "Development": 20, "Operations": 10 }, "keyTasks": [...], "milestones": [...] } ] }`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        phases: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    phaseTitle: { type: Type.STRING },
                                    phaseDescription: { type: Type.STRING },
                                    timeline: { type: Type.STRING },
                                    budgetDistribution: {
                                        type: Type.OBJECT,
                                        properties: {
                                            Marketing: { type: Type.NUMBER },
                                            Development: { type: Type.NUMBER },
                                            Legal: { type: Type.NUMBER },
                                            Operations: { type: Type.NUMBER }
                                        },
                                        required: ["Marketing", "Development"]
                                    },
                                    keyTasks: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                task: { type: Type.STRING },
                                                priority: { type: Type.STRING },
                                                details: { type: Type.STRING }
                                            }, required: ["task", "priority", "details"]
                                        }
                                    },
                                    milestones: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }, required: ["phaseTitle", "phaseDescription", "timeline", "budgetDistribution", "keyTasks", "milestones"]
                            }
                        }
                    }, required: ["title", "phases"]
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error(e);
        return null;
    }
};

export const generateBusinessQuiz = async (): Promise<any> => {
    const prompt = "Generate 10 multiple-choice questions designed to unconsciously reveal a user's ideal business sector. The questions should be subtle, avoiding direct inquiries like 'Do you prefer tech or fashion?'. Instead, use scenarios, preferences, and problem-solving situations to gauge their affinity for various fields such as Technology/Software, Fashion/Apparel, Food & Hospitality, Creative Arts, E-commerce, and Service-based industries. The goal is to determine which business environment the user would naturally excel in.";
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: { type: Type.STRING },
                                    options: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                 required: ["question", "options"]
                            }
                        }
                    },
                    required: ["questions"]
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch(e) { console.error(e); return null; }
};

export const evaluateBusinessQuiz = async (userAnswers: any[]): Promise<any> => {
    const prompt = `Based on these user answers: ${JSON.stringify(userAnswers)}, generate 10 innovative and diverse business ideas tailored to the user's profile. For each idea, provide a catchy title and a short, compelling one-sentence description.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        ideas: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING }
                                },
                                required: ["title", "description"]
                            }
                        }
                    },
                     required: ["ideas"]
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch(e) { console.error(e); return null; }
};

export const getBusinessDeepDive = async (ideaTitle: string): Promise<string> => {
    const prompt = `Provide a deep research report for a business idea titled "${ideaTitle}". The report should be well-structured HTML and cover: 1. Business Idea (detailed explanation), 2. Unique Selling Proposition (USP), 3. Market Analysis (target audience, market size, competition), 4. Future Potential (growth opportunities), and 5. A comprehensive SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats). Use h3 tags for each section and styled ul/li for lists. The entire output must be a single block of HTML with no markdown formatting.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });
        return response.text || "<p>Could not generate report.</p>";
    } catch(e) { console.error(e); return "<p>Error fetching report.</p>"; }
};

// --- VIDEO SEARCH METHOD ---

export const searchYoutubeVideos = async (topic: string, context: string): Promise<any[]> => {
  const prompt = `
    Fast search task: Find 6-9 distinct educational YouTube videos about "${topic}" for a student in "${context}".
    
    Return a JSON array. For each video, provide:
    1. "title": Video title.
    2. "url": Valid YouTube watch URL.
    3. "difficulty": "Easy", "Medium", or "Hard" (estimate based on topic depth).
    4. "views": View count string (e.g. "1.2M", "500K"). Estimate if necessary.
    5. "likes": Like count string (e.g. "10K"). Estimate if necessary.

    Prioritize popular content.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Switched from pro to flash for speed
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    url: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    views: { type: Type.STRING },
                    likes: { type: Type.STRING }
                },
                required: ["title", "url", "difficulty", "views", "likes"]
            }
        }
      }
    });
    
    const videos = JSON.parse(response.text || "[]");

    // Sorting Helper to parse "1.2M", "500K" into numbers
    const parseCount = (str: string): number => {
        if (!str) return 0;
        const s = str.toUpperCase().replace(/[^0-9.KMB]/g, ''); // Clean string
        let multiplier = 1;
        if (s.includes('M')) multiplier = 1000000;
        else if (s.includes('K')) multiplier = 1000;
        else if (s.includes('B')) multiplier = 1000000000;
        
        const num = parseFloat(s.replace(/[KMB]/g, ''));
        return isNaN(num) ? 0 : num * multiplier;
    };

    // Sort by Views (Descending) then Likes (Descending)
    return videos.sort((a: any, b: any) => {
        const viewsA = parseCount(a.views);
        const viewsB = parseCount(b.views);
        if (viewsB !== viewsA) return viewsB - viewsA;
        return parseCount(b.likes) - parseCount(a.likes);
    });

  } catch (error) {
    console.error("Error searching videos:", error);
    return [];
  }
};
