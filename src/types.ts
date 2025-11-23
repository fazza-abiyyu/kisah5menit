export interface Story {
    id: string;
    slug: string;
    title: string;
    genre: string;
    theme: string;
    tone: string;
    language: string;
    created_at: string;
    updated_at: string;
    status: "draft" | "published";
    tags: string[];
    content: {
        format: string;
        body: string;
    };
    cover: {
        prompt: string;
        style: string;
        aspect_ratio: string;
        image_url?: string; // Added for local file path
    };
    meta: {
        plan_summary: string;
        target_emotion: string;
        reading_time_minutes: number;
        keywords: string[];
    };
}

export interface PlanOutput {
    plan_id: string;
    title_idea: string;
    genre: string;
    theme: string;
    tone: string;
    narrative_structure: {
        hook: string;
        conflict: string;
        climax: string;
        resolution: string;
    };
    constraints: {
        target_min_words: number;
        target_max_words: number;
        style_notes: string;
    };
    backup_alternatives: string[];
    publishing_intent: string;
}

export interface GenerationOutput {
    raw_story_text: string;
    word_count: number;
    quality_flags: {
        pacing_ok: boolean;
        tone_consistent: boolean;
        ending_clear: boolean;
        theme_visible: boolean;
    };
}

export interface RevisionOutput {
    final_story_text: string;
    final_word_count: number;
}

export interface CoverPromptOutput {
    cover_prompt: string;
    style: string;
    aspect_ratio: string;
    safety_notes: string;
}

export interface PackagingOutput {
    story_record: Story;
    routing_preview: {
        dashboard_path: string;
        detail_path_template: string;
        detail_example: string;
    };
}

export interface BatchStoryRecord {
    id: string;
    slug: string;
    title: string;
    genre: string;
    created_at: string;
    tags: string[];
}

export interface FileArtifact {
    path: string;
    content?: string;
    image_prompt?: string;
    note?: string;
}

export interface BatchAgentOutput {
    story_record: BatchStoryRecord;
    file_artifacts: FileArtifact[];
}
