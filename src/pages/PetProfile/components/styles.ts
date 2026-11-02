import styled from 'styled-components';

export const PetProfileWrapper = styled.div`
  padding: 32px 28px;
  max-width: 1040px;
  margin: 0 auto;

  @media (max-width: 640px) {
    padding: 20px 16px;
  }

  .pet-hero {
    display: flex;
    gap: 24px;
    align-items: center;
    flex-wrap: wrap;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 20px;

    .hero-photo {
      width: 120px;
      height: 120px;
      border-radius: 18px;
      object-fit: cover;
      border: 3px solid #ffffff;
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);
    }

    .hero-placeholder {
      width: 120px;
      height: 120px;
      border-radius: 18px;
      background: #e6fffa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 52px;
      border: 2px dashed #99f6e4;
    }

    .hero-meta {
      flex: 1;
      min-width: 220px;

      .hero-title-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 8px;

        h2 {
          margin: 0;
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          word-break: break-word;
        }
      }

      .code-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #ffffff;
        border: 1px solid #99f6e4;
        color: #0d9488;
        font-family: monospace;
        font-weight: 700;
        font-size: 13px;
        padding: 3px 10px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: #ccfbf1;
        }
      }

      .created-at {
        display: block;
        margin-top: 8px;
        font-size: 13px;
        color: #64748b;
      }
    }

    .hero-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;

      .btn-book {
        background: #0d9488;
        border-color: #0d9488;

        &:hover {
          background: #0f766e !important;
          border-color: #0f766e !important;
        }
      }
    }

    @media (max-width: 640px) {
      flex-direction: column;
      align-items: flex-start;

      .hero-actions {
        width: 100%;
      }
    }
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 20px;

    @media (max-width: 900px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 520px) {
      grid-template-columns: 1fr;
    }

    .metric-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;

      .label {
        font-size: 12px;
        color: #64748b;
        margin-bottom: 4px;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.3px;
      }

      .value {
        font-size: 15px;
        font-weight: 700;
        color: #0f172a;
        word-break: break-word;
      }
    }
  }

  .notes-box {
    background: #fffbeb;
    border: 1px solid #fef3c7;
    border-radius: 12px;
    padding: 16px 18px;
    margin-bottom: 20px;

    .notes-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #b45309;
      margin-bottom: 6px;
    }

    .notes-content {
      font-size: 14px;
      color: #78350f;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }

  .timeline-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 20px 24px;

    .timeline-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .timeline-subtitle {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 8px;
    }
  }
`;
