// import type { UploadFile } from 'antd';
import { clsx, type ClassValue } from 'clsx';
export const cn = (...inputs: ClassValue[]) => {
  return clsx(inputs);
};

// Uploaded files (club logos etc.) are stored on the BACKEND and referenced
// by a server-relative path like "/uploads/clubs/xxx.jpg" — resolving that
// against the FE's own origin (Vite dev server) returns the SPA's index.html
// instead of the image, so it silently renders blank. Absolute URLs (old
// Unsplash presets, Google avatar URLs, data: URIs) are left untouched.
export const resolveMediaUrl = (path?: string | null): string => {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  const apiRoot = import.meta.env.VITE_API_ROOT || '';
  const backendOrigin = apiRoot.replace(/\/api\/?$/, '');
  return `${backendOrigin}${path}`;
};

export const trimData = (data: unknown): unknown => {
  if (data == null) return data; // null hoặc undefined

  if (typeof data === 'string') {
    return data.trim();
  }

  if (Array.isArray(data)) {
    return data.map(trimData);
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      result[key] = trimData(val);
    }
    return result;
  }

  return data;
};

type ConstantItem = {
  value: string | number;
  label: string;
  technicalRequirement1Text?: string;
  technicalRequirement2Text?: string;
  sampleDimension1Text?: string;
  sampleDimension2Text?: string;
  labRemarkText?: string;
};
export function getLabelFromConstant(
  constants: Record<string, ConstantItem>,
  value: string | number,
  type?: string
): string {
  const match = Object.values(constants).find(
    item => item.value.toString() === value.toString()
  );

  switch (type) {
    case 'label':
      return match?.label ?? value.toString();

    case 'technicalRequirement1Text':
      return match?.technicalRequirement1Text ?? value.toString();

    case 'technicalRequirement2Text':
      return match?.technicalRequirement2Text ?? value.toString();

    case 'sampleDimension1Text':
      return match?.sampleDimension1Text ?? value.toString();

    case 'sampleDimension2Text':
      return match?.sampleDimension2Text ?? value.toString();

    case 'labRemarkText':
      return match?.labRemarkText ?? value.toString();

    default:
      return match?.label ?? value.toString();
  }
}

// export const normFile = (e: any) => {
//   if (Array.isArray(e)) {
//     return e;
//   }
//   return e?.fileList;
// };

export const validatorFileExtension = (
  fileName: string,
  acceptFile: string
) => {
  const parts: Array<string | undefined> = fileName.split('.');
  let type: string | undefined = '';
  if (parts.length > 1) {
    type = parts.pop();
  }
  if (!!type && acceptFile.includes(type.toLowerCase())) return true;
  return false;
};
