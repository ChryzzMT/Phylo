"""Convert Riel_y_carrito_v2.stl (millimeters) into a meters-scale GLB.

The STL is one unwelded triangle soup. After welding vertices, connected
components separate the rail frame (static node `hardware`) from the cart
(dynamic node `carrito`). Dense parts are decimated for the web.

Requires: trimesh, numpy, scipy, fast-simplification.

    python3 scripts/convert-riel-stl.py Riel_y_carrito_v2.stl public/models/riel-y-carrito.glb

Copy the printed railLength into public/data/mruv.json if the travel limit changes.
"""

import argparse
from pathlib import Path

import fast_simplification
import numpy as np
import trimesh
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from trimesh.visual.material import PBRMaterial

RAIL_Z = 1099.7


def target_count(face_count: int) -> int | None:
    """Keep small CAD parts intact. Decimate the dense rail and cart bodies."""
    if face_count <= 2200:
        return None
    if face_count > 50000:
        return 9000
    if face_count > 10000:
        return 1800
    return max(500, int(face_count * 0.12))


def simplify_mesh(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    count = target_count(len(mesh.faces))
    if count is None or count >= len(mesh.faces):
        return mesh
    points, faces = fast_simplification.simplify(
        mesh.vertices.astype(np.float64),
        mesh.faces.astype(np.int32),
        target_count=count,
        agg=7.0,
    )
    simplified = trimesh.Trimesh(points, faces, process=True)
    simplified.remove_unreferenced_vertices()
    return simplified


def paint(mesh: trimesh.Trimesh, rgb: tuple[float, float, float], name: str) -> None:
    mesh.visual = trimesh.visual.TextureVisuals(
        material=PBRMaterial(
            name=name,
            baseColorFactor=[*rgb, 1.0],
            metallicFactor=0.25,
            roughnessFactor=0.55,
            doubleSided=True,
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stl", type=Path, help="Binary STL in millimeters")
    parser.add_argument("glb", type=Path, help="Output GLB in meters")
    args = parser.parse_args()

    print("loading", args.stl)
    mesh = trimesh.load(args.stl, force="mesh", process=True)
    faces = mesh.faces
    vertices = mesh.vertices
    edges = mesh.face_adjacency
    graph = coo_matrix(
        (np.ones(len(edges), dtype=np.uint8), (edges[:, 0], edges[:, 1])),
        shape=(len(faces), len(faces)),
    )
    graph = graph.maximum(graph.T)
    count, labels = connected_components(graph, directed=False)
    print("components", count, "faces", len(faces), "verts", len(vertices))

    vertex_label = np.empty(len(vertices), dtype=np.int32)
    vertex_label[faces[:, 0]] = labels
    vertex_label[faces[:, 1]] = labels
    vertex_label[faces[:, 2]] = labels

    vmin = np.full((count, 3), np.inf)
    vmax = np.full((count, 3), -np.inf)
    np.minimum.at(vmin, vertex_label, vertices)
    np.maximum.at(vmax, vertex_label, vertices)
    center = (vmin + vmax) / 2
    extent = vmax - vmin

    is_cart = (
        (center[:, 0] < 70)
        & (np.abs(center[:, 2] - RAIL_Z) < 25)
        & (center[:, 1] < 80)
        & (extent[:, 0] < 80)
        & (extent[:, 2] < 60)
    )
    face_is_cart = is_cart[labels]
    print(
        "cart components",
        int(is_cart.sum()),
        "cart faces",
        int(face_is_cart.sum()),
        "static faces",
        int((~face_is_cart).sum()),
    )

    cart_parts = []
    static_parts = []
    for index in range(count):
        face_index = np.where(labels == index)[0]
        if len(face_index) == 0:
            continue
        part = mesh.submesh([face_index], append=True, repair=False)
        part = simplify_mesh(part)
        if is_cart[index]:
            cart_parts.append(part)
        else:
            static_parts.append(part)
        if len(mesh.faces[face_index]) > 1800:
            print(
                f"  part {index:4d} {'cart' if is_cart[index] else 'static':6} "
                f"{len(face_index):7d} -> {len(part.faces):6d}"
            )

    static_mesh = trimesh.util.concatenate(static_parts)
    cart_mesh = trimesh.util.concatenate(cart_parts)
    print("merged static", len(static_mesh.faces), "cart", len(cart_mesh.faces))

    # STL millimeters -> meters. Seat the assembly on y = 0 and center x/z.
    scale = 0.001
    static_mesh.apply_scale(scale)
    cart_mesh.apply_scale(scale)
    mins = np.minimum(static_mesh.bounds[0], cart_mesh.bounds[0])
    maxs = np.maximum(static_mesh.bounds[1], cart_mesh.bounds[1])
    translation = np.array([-(mins[0] + maxs[0]) / 2, -mins[1], -(mins[2] + maxs[2]) / 2])
    static_mesh.apply_translation(translation)
    cart_mesh.apply_translation(translation)

    cart_max_x = float(cart_mesh.bounds[1][0])
    # Far end plate sits at the high-x tip of the static frame.
    end_x = float(static_mesh.bounds[1][0])
    # Leave a small gap so the cart stops before clipping the end plate (~2 cm).
    rail_length = max(0.2, round(end_x - cart_max_x - 0.02, 3))
    print("bounds static", static_mesh.bounds.round(4).tolist())
    print("bounds cart", cart_mesh.bounds.round(4).tolist())
    print("translation", translation.round(5).tolist())
    print("railLength", rail_length)
    print("cart center", cart_mesh.centroid.round(4).tolist())

    paint(static_mesh, (0.62, 0.68, 0.74), "hardware")
    paint(cart_mesh, (0.86, 0.45, 0.16), "carrito")
    static_mesh.metadata["name"] = "hardware"
    cart_mesh.metadata["name"] = "carrito"

    scene = trimesh.Scene()
    scene.add_geometry(static_mesh, geom_name="hardware", node_name="hardware")
    scene.add_geometry(cart_mesh, geom_name="carrito", node_name="carrito")
    args.glb.parent.mkdir(parents=True, exist_ok=True)
    scene.export(args.glb)
    print("wrote", args.glb, "bytes", args.glb.stat().st_size)
    print("Update railLength in public/data/mruv.json if this value changed:", rail_length)


if __name__ == "__main__":
    main()
