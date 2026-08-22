import { CloudUpload, FileText, Trash2 } from "lucide-react";
import React, { useState, useRef, useCallback } from "react";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

interface UploadProps {
  onChange?: (files: File[]) => void;
  onRemove?: (file: File) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  mode?: "dropzone" | "button";
  customNode?: React.ReactNode;
  preview?: boolean;
}

interface FileItemProps {
  file: File;
  onRemove: (file: File) => void;
  preview?: boolean;
}

const FileItem: React.FC<FileItemProps> = ({ file, onRemove, preview }) => {
  const fileSize = (file.size / (1024 * 1024)).toFixed(2);
  const isImage = file.type.startsWith("image/");

  return (
    <div className="flex items-center justify-between p-3 bg-panel-2 rounded-lg">
      <div className="flex items-center gap-3">
        {preview && isImage ? (
          <img
            src={URL.createObjectURL(file)}
            alt={file.name}
            className="w-12 h-12 object-cover rounded-md border"
            onLoad={(e) =>
              URL.revokeObjectURL((e.target as HTMLImageElement).src)
            }
          />
        ) : (
          <FileText className="text-primary text-xl" />
        )}
        <div>
          <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
            {file.name}
          </p>
          <p className="text-xs text-muted-foreground">{fileSize} MB</p>
        </div>
      </div>
      <button
        onClick={() => onRemove(file)}
        className="p-1 hover:bg-raised-2 rounded-full transition-colors"
      >
        <Trash2 className="text-destructive text-xl" />
      </button>
    </div>
  );
};

const Upload: React.FC<UploadProps> = ({
  onChange,
  onRemove,
  accept,
  multiple = false,
  maxSize,
  disabled = false,
  className = "",
  icon,
  mode = "dropzone",
  customNode,
  preview = false,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locale = useSettingsStore((state) => state.uiLocale);

  const handleFiles = useCallback(
    (newFiles: FileList) => {
      setError(null);

      const validFiles = Array.from(newFiles).filter((file) => {
        if (maxSize && file.size > maxSize * 1024 * 1024) {
          setError(
            text(
              locale,
              `ไฟล์ต้องมีขนาดไม่เกิน ${maxSize}MB`,
              `File size should not exceed ${maxSize}MB`
            )
          );
          return false;
        }
        if (accept && !file.type.match(accept.replace(/,/g, "|"))) {
          setError(
            text(
              locale,
              `ชนิดไฟล์ไม่ถูกต้อง รองรับ: ${accept}`,
              `Invalid file type. Accepted: ${accept}`
            )
          );
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        const updatedFiles = multiple ? [...files, ...validFiles] : validFiles;
        setFiles(updatedFiles);
        onChange?.(updatedFiles);
      }
    },
    [accept, files, locale, maxSize, multiple, onChange]
  );

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (fileToRemove: File) => {
    const newFiles = files.filter((f) => f !== fileToRemove);
    setFiles(newFiles);
    onRemove?.(fileToRemove);
    onChange?.(newFiles);
  };

  const renderDropzone = () => (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 text-center
        ${isDragging ? "border-primary bg-primary/10" : "border-line"}
        ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:border-primary"
        }
      `}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      onClick={openFileDialog}
    >
      <div className="flex items-center justify-center">
        {icon || <CloudUpload className="text-4xl text-primary" />}
      </div>
      <p className="text-foreground font-medium ">
        {text(
          locale,
          "ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์",
          "Drag and drop files or click to browse"
        )}
      </p>
      <p className="text-sm text-muted-foreground">
        {multiple
          ? text(locale, "อัปโหลดหลายไฟล์", "Upload multiple files")
          : text(locale, "อัปโหลดไฟล์เดียว", "Upload single file")}
        {accept && ` (${accept})`}
      </p>
      {maxSize && (
        <p className="text-sm text-muted-foreground">
          {text(locale, "ขนาดไฟล์สูงสุด", "Maximum file size")}: {maxSize}MB
        </p>
      )}
    </div>
  );

  const renderButton = () => (
    <button
      onClick={openFileDialog}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium 
        hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {icon || <CloudUpload className="inline-block mr-2" />}
      {text(locale, "อัปโหลดไฟล์", "Upload File")}
    </button>
  );

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
      />

      {customNode ? (
        <div onClick={openFileDialog} className="cursor-pointer">
          {customNode}
        </div>
      ) : mode === "dropzone" ? (
        renderDropzone()
      ) : (
        renderButton()
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {preview && files.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {files.map((file, idx) => (
            <FileItem
              key={`${file.name}-${idx}`}
              file={file}
              onRemove={handleRemove}
              preview={preview}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Upload;
