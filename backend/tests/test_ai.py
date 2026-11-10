"""Группировка обращений по смыслу: чистая математика без загрузки модели."""

import numpy as np

from app.ai.embeddings import group_similar, nearest_cluster


def unit(*values: float) -> np.ndarray:
    vector = np.array(values, dtype=np.float32)
    return vector / np.linalg.norm(vector)


def test_group_similar_links_close_tickets_and_drops_singletons():
    vectors = {
        "a": unit(1, 0, 0),
        "b": unit(0.9, 0.1, 0),
        "c": unit(0.8, 0.3, 0),
        "far": unit(0, 0, 1),
    }
    assert [sorted(g) for g in group_similar(vectors, threshold=0.9)] == [["a", "b", "c"]]


def test_nearest_cluster_requires_threshold():
    members = {"catalog": [unit(1, 0, 0), unit(0.9, 0.2, 0)], "docs": [unit(0, 1, 0)]}
    assert nearest_cluster(unit(1, 0.1, 0), members, threshold=0.6)[0] == "catalog"
    assert nearest_cluster(unit(0, 0, 1), members, threshold=0.6)[0] == ""
