import {
  TrainingModule,
  TrainingLesson,
} from "./trainingModuleGeneratorService";

/**
 * Mock Training Module Generator Service for demonstration purposes
 * This generates realistic training modules without requiring external API calls
 */
export class MockTrainingModuleGeneratorService {
  /**
   * Generate mock training modules from domain knowledge
   */
  async generateTrainingModulesFromDomainKnowledge(): Promise<
    TrainingModule[]
  > {
    console.log("🚀 Starting mock training module generation...");
    console.log("📚 Simulating analysis of domain knowledge documents...");

    // Simulate processing time
    await this.delay(2000);

    const modules: TrainingModule[] = [
      {
        title: "Meta Ads Performance Marketing Essentials",
        description:
          "Comprehensive training on Meta Ads platform, targeting strategies, and performance optimization for sales professionals.",
        estimatedDuration: "4 hours",
        difficulty: "intermediate",
        objectives: [
          "Understand Meta Ads platform architecture and capabilities",
          "Master audience targeting and segmentation strategies",
          "Learn campaign optimization techniques for maximum ROI",
          "Develop skills in performance analysis and reporting",
        ],
        keyTakeaways: [
          "Meta Ads can drive 90% accuracy in customer targeting",
          "Proper campaign structure increases ROAS by 40%",
          "Pixel integration is crucial for conversion tracking",
          "A/B testing improves campaign performance by 25%",
        ],
        lessons: [
          {
            title: "Introduction to Meta Ads Ecosystem",
            content:
              "Learn about Facebook, Instagram, and Audience Network advertising opportunities. Understand the Meta Business Manager interface, campaign structures, and basic terminology. Explore how Meta Ads integrates with business objectives and customer journey mapping.",
            duration: "45 minutes",
            type: "theory",
            resources: [
              "Meta Ads Manager Tutorial",
              "Business Manager Setup Guide",
              "Audience Network Overview",
            ],
          },
          {
            title: "Targeting and Audience Development",
            content:
              "Master audience creation using demographics, interests, behaviors, and custom audiences. Learn about lookalike audiences, retargeting strategies, and audience exclusions. Practice building targeted campaigns for different business scenarios.",
            duration: "60 minutes",
            type: "practical",
            resources: [
              "Audience Insights Tool",
              "Custom Audience Creation Guide",
              "Targeting Best Practices",
            ],
          },
          {
            title: "Campaign Optimization Strategies",
            content:
              "Understand bid strategies, budget allocation, and ad placement optimization. Learn about campaign objectives, conversion events, and performance metrics. Explore automated optimization features and when to use manual controls.",
            duration: "75 minutes",
            type: "practical",
            resources: [
              "Optimization Checklist",
              "Bid Strategy Comparison",
              "Performance Metrics Dashboard",
            ],
          },
          {
            title: "Assessment: Meta Ads Campaign Planning",
            content:
              "Create a complete campaign strategy for a given business scenario. Include audience targeting, budget allocation, creative requirements, and success metrics. Present optimization recommendations based on performance data.",
            duration: "60 minutes",
            type: "assessment",
            resources: [
              "Campaign Planning Template",
              "ROI Calculator",
              "Performance Analysis Framework",
            ],
          },
        ],
      },
      {
        title: "AR/VR Solutions for Enterprise Sales",
        description:
          "Training module focused on selling Meta's AR/VR solutions to enterprise clients, understanding use cases, and addressing common objections.",
        estimatedDuration: "3 hours",
        difficulty: "advanced",
        objectives: [
          "Identify enterprise AR/VR use cases and opportunities",
          "Understand technical requirements and implementation challenges",
          "Master ROI discussions and value proposition development",
          "Handle common objections and competitive differentiation",
        ],
        keyTakeaways: [
          "AR/VR solutions can reduce training costs by 40%",
          "Enterprise adoption increases productivity by 30%",
          "Meta Quest Pro offers superior enterprise features",
          "Implementation typically requires 3-6 month timeline",
        ],
        lessons: [
          {
            title: "Enterprise AR/VR Market Overview",
            content:
              "Explore the current state of enterprise AR/VR adoption, key industry trends, and market opportunities. Understand the difference between consumer and enterprise applications, and identify high-value use cases across industries.",
            duration: "40 minutes",
            type: "theory",
            resources: [
              "Market Research Report",
              "Industry Use Case Database",
              "ROI Case Studies",
            ],
          },
          {
            title: "Technical Solution Architecture",
            content:
              "Learn about Meta Quest Pro hardware capabilities, software ecosystem, and integration requirements. Understand network requirements, security considerations, and scalability factors for enterprise deployments.",
            duration: "50 minutes",
            type: "theory",
            resources: [
              "Technical Specifications",
              "Integration Guide",
              "Security Best Practices",
            ],
          },
          {
            title: "Sales Conversation Simulation",
            content:
              "Practice conducting enterprise AR/VR sales conversations using real scenarios. Learn to identify pain points, present solutions, handle objections, and close deals. Focus on ROI justification and implementation planning.",
            duration: "70 minutes",
            type: "practical",
            resources: [
              "Sales Playbook",
              "Objection Handling Guide",
              "ROI Calculator",
            ],
          },
        ],
      },
    ];

    // Print each module to console
    for (const module of modules) {
      this.printTrainingModule(module);
    }

    console.log(
      `🎉 Successfully generated ${modules.length} mock training modules!`
    );
    return modules;
  }

  /**
   * Generate mock modules from synthetic data
   */
  async generateFromSyntheticData(): Promise<TrainingModule[]> {
    console.log("🔄 Generating mock training modules from synthetic data...");

    await this.delay(1500);

    const module: TrainingModule = {
      title: "Meta Llama AI Sales Mastery",
      description:
        "Complete training program for selling Meta Llama AI solutions to enterprise clients, including technical understanding and sales techniques.",
      estimatedDuration: "5 hours",
      difficulty: "intermediate",
      objectives: [
        "Understand Meta Llama model capabilities and applications",
        "Identify ideal customer profiles and use cases",
        "Master technical discussions and demonstrations",
        "Develop compelling value propositions and ROI arguments",
      ],
      keyTakeaways: [
        "Llama models achieve 90% accuracy in language tasks",
        "Enterprise implementations show 25% efficiency gains",
        "Fine-tuning capabilities enable industry-specific solutions",
        "Meta's infrastructure ensures enterprise-grade reliability",
      ],
      lessons: [
        {
          title: "Introduction to Meta Llama Models",
          content:
            "Comprehensive overview of Meta Llama architecture, capabilities, and competitive advantages. Learn about different model sizes, performance characteristics, and licensing options. Understand the evolution from Llama 1 to Llama 3.3 and key improvements.",
          duration: "60 minutes",
          type: "theory",
          resources: [
            "Llama Technical Documentation",
            "Model Comparison Chart",
            "Performance Benchmarks",
          ],
        },
        {
          title: "Enterprise Use Cases and Applications",
          content:
            "Explore real-world enterprise applications including customer service automation, content generation, data analysis, and workflow optimization. Review case studies from healthcare, finance, and technology sectors.",
          duration: "75 minutes",
          type: "theory",
          resources: [
            "Enterprise Case Studies",
            "Use Case Library",
            "Implementation Examples",
          ],
        },
        {
          title: "Technical Sales Conversations",
          content:
            "Practice explaining technical concepts to non-technical stakeholders. Learn to conduct product demonstrations, handle technical objections, and collaborate with customer technical teams during evaluation processes.",
          duration: "90 minutes",
          type: "practical",
          resources: ["Demo Scripts", "Technical FAQ", "Integration Checklist"],
        },
        {
          title: "ROI and Value Proposition Development",
          content:
            "Master the art of building compelling business cases for Llama implementations. Learn to quantify benefits, calculate ROI, and present value propositions that resonate with C-level executives.",
          duration: "60 minutes",
          type: "practical",
          resources: [
            "ROI Templates",
            "Value Proposition Framework",
            "Executive Presentation Deck",
          ],
        },
        {
          title: "Final Assessment: Complete Sales Pitch",
          content:
            "Deliver a complete sales presentation for Meta Llama solutions to a simulated enterprise customer. Include technical overview, use case mapping, ROI justification, and implementation roadmap.",
          duration: "75 minutes",
          type: "assessment",
          resources: [
            "Presentation Template",
            "Evaluation Rubric",
            "Customer Scenario Brief",
          ],
        },
      ],
    };

    this.printTrainingModule(module);

    console.log("✅ Generated training module from synthetic data");
    return [module];
  }

  /**
   * Print training module to console in formatted way
   */
  private printTrainingModule(module: TrainingModule): void {
    console.log("\n" + "=".repeat(80));
    console.log(`📚 TRAINING MODULE: ${module.title.toUpperCase()}`);
    console.log("=".repeat(80));

    console.log(`\n📖 Description: ${module.description}`);
    console.log(`⏱️  Estimated Duration: ${module.estimatedDuration}`);
    console.log(`📊 Difficulty: ${module.difficulty}`);

    console.log(`\n🎯 Learning Objectives:`);
    module.objectives.forEach((objective, index) => {
      console.log(`   ${index + 1}. ${objective}`);
    });

    console.log(`\n🔑 Key Takeaways:`);
    module.keyTakeaways.forEach((takeaway, index) => {
      console.log(`   ${index + 1}. ${takeaway}`);
    });

    console.log(`\n📋 Lessons (${module.lessons.length} total):`);
    module.lessons.forEach((lesson, index) => {
      console.log(`\n   Lesson ${index + 1}: ${lesson.title}`);
      console.log(`   Type: ${lesson.type} | Duration: ${lesson.duration}`);
      console.log(
        `   Content: ${lesson.content.substring(0, 200)}${
          lesson.content.length > 200 ? "..." : ""
        }`
      );

      if (lesson.resources.length > 0) {
        console.log(`   Resources: ${lesson.resources.join(", ")}`);
      }
    });

    console.log("\n" + "=".repeat(80));
  }

  /**
   * Simulate processing delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default MockTrainingModuleGeneratorService;
