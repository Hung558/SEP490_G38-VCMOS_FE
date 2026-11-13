import { Descriptions, Image } from 'antd';
import dayjs from 'dayjs';
import styled from 'styled-components';
import type { GroomingNote } from '@/types';
import { GROOMING_NOTE_FIELDS } from '@/services/AppointmentServiceService';

const NoteText = styled.span`
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const GroomingNoteDetails = ({ note }: { note: GroomingNote }) => (
  <Descriptions bordered size="small" column={1}>
    {note.createdAt && (
      <Descriptions.Item label="Thời gian lưu">
        {dayjs(note.createdAt).format('HH:mm DD/MM/YYYY')}
      </Descriptions.Item>
    )}
    {GROOMING_NOTE_FIELDS.map(([field, label]) => (
      <Descriptions.Item key={field} label={label}>
        <NoteText>{note[field] || '—'}</NoteText>
      </Descriptions.Item>
    ))}
    {note.beforePhotoUrl && (
      <Descriptions.Item label="Ảnh trước">
        <Image width={144} src={note.beforePhotoUrl} alt="Ảnh trước khi spa" />
      </Descriptions.Item>
    )}
    {note.afterPhotoUrl && (
      <Descriptions.Item label="Ảnh sau">
        <Image width={144} src={note.afterPhotoUrl} alt="Ảnh sau khi spa" />
      </Descriptions.Item>
    )}
  </Descriptions>
);

export default GroomingNoteDetails;
