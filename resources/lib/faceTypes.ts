export type DetectorModel = 'tiny_face_detector' | 'ssd_mobilenetv1';
export type DistanceMetric = 'euclidean' | 'cosine';

export type MatchConfig = {
  distanceThreshold: number;
  detectionConfidence: number;
  detector: DetectorModel;
  metric: DistanceMetric;
  preprocess: {
    grayscale: boolean;
    contrastBoost: boolean;
  };
  topN: number;
};

export type ReferenceEntry = {
  stickerId: string;
  code: string;
  player: string;
  url: string;
  descriptor: number[];
  // Detector ladder rung that produced this descriptor (e.g., 'tiny@416',
  // 'tiny@608', 'tiny@800', 'ssd@0.3'). Optional — older bundles omit it.
  strategy?: string;
};

export type EmbeddingsBundle = {
  modelVersion: string;
  builtAt: string;
  detector: DetectorModel;
  scope: string;
  entries: ReferenceEntry[];
};

export type MatchResult = {
  entry: ReferenceEntry;
  distance: number;
};
