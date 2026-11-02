import styled from 'styled-components';

/** Card of the role-specific part under the account information */
export const SectionCard = styled.section`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
  padding: 24px 28px;
  margin-bottom: 32px;

  @media (max-width: 600px) {
    padding: 20px 16px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 20px;

    h4 {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }

    .section-desc {
      font-size: 13.5px;
      color: #64748b;
    }
  }

  /* Pet owner: one card per pet */
  .pet-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 14px;
  }

  .pet-card {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 14px;
    text-align: left;
    font: inherit;
    color: inherit;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    cursor: pointer;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;

    &:hover,
    &:focus-visible {
      border-color: #0d9488;
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.12);
      outline: none;
    }

    .pet-photo,
    .pet-avatar {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      flex-shrink: 0;
    }

    .pet-photo {
      object-fit: cover;
      border: 2px solid #ffffff;
    }

    .pet-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      background: #f0fdfa;
      border: 1.5px solid #ccfbf1;
    }

    .pet-meta {
      min-width: 0;
    }

    .pet-name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pet-sub {
      font-size: 13px;
      color: #475569;
    }

    .pet-code {
      font-size: 12px;
      color: #0d9488;
      font-family: monospace;
    }
  }

  /* Admin: KPI row of stat tiles */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }

  .stat-tile {
    padding: 14px 16px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;

    .stat-label {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 13px;
      color: #64748b;
    }

    .stat-value {
      font-size: 26px;
      font-weight: 600;
      line-height: 1.2;
      color: #0f172a;
    }
  }

  .shortcut-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  /* Clinic staff: screens of the role and the work schedule */
  .screen-list {
    display: grid;
    gap: 8px;
    margin-bottom: 20px;
  }

  .screen-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;

    .screen-name {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }
  }

  .schedule-box {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border: 1px dashed #cbd5e1;
    border-radius: 12px;

    .schedule-icon {
      margin-top: 2px;
      font-size: 20px;
      color: #0d9488;
    }

    strong {
      display: block;
      margin-bottom: 2px;
      color: #0f172a;
    }

    .schedule-desc {
      font-size: 13px;
      color: #64748b;
    }
  }
`;
