"use client";

import { useRef, useState } from "react";
import { Upload, Trash2, X } from "lucide-react";

export interface Photo {
  id: string;
  filename: string;
  originalName: string;
  caption: string;
}

interface Props {
  sheetId: string;
  photos: Photo[];
  onPhotosChange: () => void;
}

export default function PhotoGallery({
  sheetId,
  photos,
  onPhotosChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        await fetch(`/api/sheets/${sheetId}/photos`, {
          method: "POST",
          body: formData,
        });
      }
      onPhotosChange();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(photoId: string) {
    try {
      await fetch(`/api/sheets/${sheetId}/photos?photoId=${photoId}`, {
        method: "DELETE",
      });
      // Close preview if deleting the previewed photo
      if (previewPhoto?.id === photoId) {
        setPreviewPhoto(null);
      }
      onPhotosChange();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload button + count */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#888]">
          {photos.length} photo{photos.length !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="min-h-[48px] px-5 flex items-center gap-2 bg-[#CC0000] hover:bg-[#aa0000] disabled:opacity-50 text-white font-semibold rounded-xl text-[16px] transition-colors"
        >
          <Upload size={20} />
          {uploading ? "Uploading..." : "Add Photos"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {/* 2-column thumbnail grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square rounded-xl overflow-hidden bg-[#0a0a0a] border border-[#1e1e1e] cursor-pointer"
              onClick={() => setPreviewPhoto(photo)}
            >
              <img
                src={`/api/uploads/${photo.filename}`}
                alt={photo.originalName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Delete overlay — visible on hover / group focus */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(photo.id);
                }}
                className="absolute top-2 right-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label={`Delete ${photo.originalName}`}
              >
                <Trash2 size={18} />
              </button>
              {/* File name label */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
                <p className="text-xs text-white/80 truncate">
                  {photo.originalName}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-[#555] border border-dashed border-[#2a2a2a] rounded-xl">
          <Upload size={32} className="mb-2" />
          <p className="text-sm">No photos yet</p>
        </div>
      )}

      {/* Fullscreen preview overlay */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            aria-label="Close preview"
          >
            <X size={24} />
          </button>
          <img
            src={`/api/uploads/${previewPhoto.filename}`}
            alt={previewPhoto.originalName}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
