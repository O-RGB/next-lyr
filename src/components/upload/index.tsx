import React, { useState, useRef, useCallback } from "react";
import { MdCloudUpload, MdDelete, MdFilePresent } from "react-icons/md";

interface UploadProps {
  onChange?: (files: File[]) => void;
  onRemove?: (file: File) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

interface FileItemProps {
  file: File;
  onRemove: (file: File) => void;
}

const FileItem: React.FC<FileItemProps> = ({ file, onRemove }) => {
  // Convert bytes to MB
  const fileSize = (file.size / (1024 * 1024)).toFixed(2);

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <MdFilePresent className="text-blue-500 text-xl" />
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
  maxSize, // Default 10MB
  disabled = false,
  className = "",
  icon,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (newFiles: FileList) => {
      setError(null);

      const validFiles = Array.from(newFiles).filter((file) => {
        // Check file size
        if (maxSize ? file.size > maxSize * 1024 * 1024 : false) {
          setError(`File size should not exceed ${maxSize}MB`);
          return false;
        }

        // Check file type if accept prop is provided
        if (accept && !file.type.match(accept.replace(/,/g, "|"))) {
          setError(`Invalid file type. Accepted types: ${accept}`);
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (fileToRemove: File) => {
    const newFiles = files.filter((file) => file !== fileToRemove);
    setFiles(newFiles);
    onRemove?.(fileToRemove);
    onChange?.(newFiles);
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={className}>
      <div
        className={`
          relative
          border-2 border-dashed
          rounded-lg
          p-6
          transition-all
          duration-200
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}
          ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:border-blue-500"
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-2">
          {icon ? icon : <MdCloudUpload className="text-4xl text-blue-500" />}
          <p className="text-gray-700 font-medium text-center">
            Drag and drop your files here or click to browse
          </p>
          <p className="text-sm text-gray-500">
            {multiple ? "Upload multiple files" : "Upload single file"}
            {accept && ` (${accept})`}
          </p>
          {maxSize && (
            <p className="text-sm text-gray-500">
              Maximum file size: {maxSize}MB
            </p>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {files.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {files.map((file, index) => (
            <FileItem
              key={`${file.name}-${index}`}
              file={file}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Upload;
