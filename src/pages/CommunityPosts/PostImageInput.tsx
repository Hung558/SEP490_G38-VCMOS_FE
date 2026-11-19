import { useEffect, useId, useState } from 'react';
import { Button, Space } from 'antd';
import {
  IMAGE_ACCEPT,
  safePostImageUrl,
  validatePostImage,
} from '@/services/CommunityPostService';
import type { DraftImage } from '@/services/CommunityPostService';

interface Props {
  label: string;
  value: DraftImage;
  onChange: (value: DraftImage) => void;
  disabled?: boolean;
  error?: string;
}

export default function PostImageInput({
  label,
  value,
  onChange,
  disabled,
  error,
}: Props) {
  const id = useId();
  const [preview, setPreview] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  useEffect(() => {
    if (!value.file) {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(value.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value.file]);
  const image = preview || safePostImageUrl(value.existingUrl);
  return (
    <div className="community-image-input">
      <label htmlFor={id}>{label}</label>
      <p id={`${id}-hint`} className="community-help">
        JPEG, PNG hoặc WebP, mỗi ảnh tối đa 5 MB.
      </p>
      {image && (
        <img
          src={image}
          alt={`Ảnh đã chọn: ${label}`}
          className="community-image-preview"
        />
      )}
      <input
        id={id}
        type="file"
        accept={IMAGE_ACCEPT}
        disabled={disabled}
        aria-describedby={`${id}-hint ${id}-error`}
        aria-invalid={Boolean(fileError || error)}
        onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          const failure = validatePostImage(file);
          setFileError(failure);
          if (!failure) onChange({ ...value, file });
        }}
      />
      {value.file && (
        <p className="community-help">Ảnh mới: {value.file.name}</p>
      )}
      {(value.file || value.existingUrl) && (
        <Space wrap>
          <Button
            size="small"
            disabled={disabled}
            onClick={() => {
              setFileError(undefined);
              onChange({});
            }}
          >
            Gỡ ảnh
          </Button>
          {value.file && value.existingUrl && (
            <Button
              size="small"
              disabled={disabled}
              onClick={() => onChange({ existingUrl: value.existingUrl })}
            >
              Giữ ảnh cũ
            </Button>
          )}
        </Space>
      )}
      <p
        id={`${id}-error`}
        className="community-field-error"
        role={fileError || error ? 'alert' : undefined}
      >
        {fileError || error}
      </p>
    </div>
  );
}
