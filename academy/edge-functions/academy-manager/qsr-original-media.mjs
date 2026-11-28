// Exact QSR V2 module to existing private source object mapping. No URLs or credentials.
// These are candidate bindings, not a declaration of verified bytes, review or publication.
export const QSR_ORIGINAL_MEDIA = Object.freeze([
  {
    "module_id": "90c7a7bd-6ce1-8720-b5e1-325bcf31738a",
    "position": 1,
    "title": "Promotion Is Not Preparation",
    "object_path": "Care & Stay QSR Leadership Academy _ Module 01 _ Promotion Is Not Preparation_1080p_caption.mp4",
    "expected_bytes": 65000372,
    "duration_seconds": 137
  },
  {
    "module_id": "837e5de0-298c-8e5a-aee9-e53234e07f3b",
    "position": 2,
    "title": "Leading Yourself Before Leading Others",
    "object_path": "Care & Stay QSR Leadership Academy _ Module 02 _ Leading Yourself Before Leading Others_1080p_caption.mp4",
    "expected_bytes": 64768928,
    "duration_seconds": 137
  },
  {
    "module_id": "52fe5b38-4200-8127-950f-58360d6fe641",
    "position": 3,
    "title": "The Power of a Better Question",
    "object_path": "Care & Stay QSR Leadership Academy _ Module 03 _ The Power of a Better Question_1080p_caption.mp4",
    "expected_bytes": 115599120,
    "duration_seconds": 146
  },
  {
    "module_id": "85ac8c72-707e-8c37-b44c-6d2bd8fc1a54",
    "position": 4,
    "title": "Stop Solving. Start Developing.",
    "object_path": "Care & Stay QSR Leadership Academy _ Module 04 _ Stop Solving. Start Developing._1080p_caption.mp4",
    "expected_bytes": 87665317,
    "duration_seconds": 141
  },
  {
    "module_id": "d0499d07-2c43-88c5-af6d-d658bb365648",
    "position": 5,
    "title": "From Conflict to Possibility",
    "object_path": "Care & Stay QSR Leadership Academy _ Module 05 _ From Conflict to Possibility_1080p_caption.mp4",
    "expected_bytes": 63291934,
    "duration_seconds": 147
  },
  {
    "module_id": "0568aa40-8a0f-8d75-a589-75a931b35b67",
    "position": 6,
    "title": "Compassion and Accountability",
    "object_path": "Care & Stay QSR Leadership Academy _ Module 06 _ Compassion and Accountability_1080p_caption.mp4",
    "expected_bytes": 113809806,
    "duration_seconds": 155
  },
  {
    "module_id": "af10d499-1d8a-8eeb-b9f7-89f3cd77b9e9",
    "position": 7,
    "title": "Creating a Place Where People Want to Stay",
    "object_path": "Care & Stay QSR Leadership Academy _ Module 07 _ Creating a Place Where People Want to Stay_1080p_caption.mp4",
    "expected_bytes": 94247683,
    "duration_seconds": 144
  },
  {
    "module_id": "8f4821da-3d9a-882e-9d7d-41a6a9f6aa37",
    "position": 8,
    "title": "Developing Leaders, Not Followers",
    "object_path": "Care & Stay QSR Leadership Academy _ Module 08 _ Developing Leaders, Not Followers_1080p_caption.mp4",
    "expected_bytes": 68157937,
    "duration_seconds": 151
  }
].map(Object.freeze));
export function validQsrOriginalPath(moduleId, path) {
  return QSR_ORIGINAL_MEDIA.some(row => row.module_id === moduleId && row.object_path === path);
}
