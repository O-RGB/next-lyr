import React, { useState, useRef, useCallback } from "react";
import { MdCloudUpload, MdDelete, MdFilePresent } from "react-icons/md";

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
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
          <MdFilePresent className="text-blue-500 text-xl" />
        )}
        <div>
          <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
            {file.name}
          </p>
          <p className="text-xs text-gray-500">{fileSize} MB</p>
        </div>
      </div>
      <button
        onClick={() => onRemove(file)}
        className="p-1 hover:bg-gray-200 rounded-full transition-colors"
      >
        <MdDelete className="text-red-500 text-xl" />
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

  const handleFiles = useCallback(
    (newFiles: FileList) => {
      setError(null);

      const validFiles = Array.from(newFiles).filter((file) => {
        if (maxSize && file.size > maxSize * 1024 * 1024) {
          setError(`File size should not exceed ${maxSize}MB`);
          return false;
        }
        if (accept && !file.type.match(accept.replace(/,/g, "|"))) {
          setError(`Invalid file type. Accepted: ${accept}`);
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
    [accept, maxSize, multiple, files, onChange]
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
        relative border-2 border-dashed rounded-lg p-6 transition-all duration-200
        ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}
        ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:border-blue-500"
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
      {icon || <MdCloudUpload className="text-4xl text-blue-500" />}
      <p className="text-gray-700 font-medium text-center">
        Drag and drop files or click to browse
      </p>
      <p className="text-sm text-gray-500">
        {multiple ? "Upload multiple files" : "Upload single file"}
        {accept && ` (${accept})`}
      </p>
      {maxSize && (
        <p className="text-sm text-gray-500">Maximum file size: {maxSize}MB</p>
      )}
    </div>
  );

  const renderButton = () => (
    <button
      onClick={openFileDialog}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg bg-blue-500 text-white font-medium 
        hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {icon || <MdCloudUpload className="inline-block mr-2" />}
      Upload File
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

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

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
