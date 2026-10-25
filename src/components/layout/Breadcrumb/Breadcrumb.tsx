'use client';

import LayoutCommon from '@/components/common/LayoutCommon';
import { capitalizeWords } from '@/lib/stringsUtils';
import { cn } from '@/lib/utils';
import { breadcrumbMap } from '@/routerMap/breadcrumbMap';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface BreadcrumbProps {
  className?: string;
}

// Route params (Mongo ObjectIds, numeric ids) are meaningless to users —
// never display them as breadcrumb segments.
const isIdSegment = (segment: string) =>
  /^[a-f0-9]{24}$/i.test(segment) || /^\d+$/.test(segment);

const Breadcrumb = ({ className }: BreadcrumbProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const pathSegments = pathname
    .split('/')
    .filter(segment => segment && segment !== '');

  // Plain-text location trail — intermediate segments are NOT links because
  // most partial paths (/truong-ban, /chu-nhiem/tai-chinh...) aren't real
  // routes; clicking them used to land on 404. Navigation happens through
  // the back button / menus instead.
  const breadcrumbs = pathSegments
    .filter(segment => !isIdSegment(segment))
    .map(segment => {
      const label =
        breadcrumbMap[segment] ||
        decodeURIComponent(segment.replace(/-/g, ' '));
      return breadcrumbMap[segment] ? label : capitalizeWords(label);
    });

  return (
    <div
      style={{
        display: breadcrumbs?.length ? 'block' : 'none',
      }}
    >
      <LayoutCommon>
        <nav
          className={cn('d-flex-center text-sm space-x-1', className)}
          aria-label="breadcrumb"
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            title="Quay lại trang trước"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'oklch(.552 .016 285.938)',
              padding: '2px 6px',
              borderRadius: 6,
            }}
          >
            <ArrowLeft size={16} />
          </button>

          {breadcrumbs.map((label, index) => (
            <div key={`${label}-${index}`} className="d-flex-center p-2 g-2">
              {!!index && (
                <ChevronRight size={14} color="oklch(.552 .016 285.938)" />
              )}
              <span
                className={
                  index === breadcrumbs.length - 1
                    ? 'text-gray-800'
                    : 'text-gray-500'
                }
                style={
                  index === breadcrumbs.length - 1
                    ? { fontWeight: 600 }
                    : undefined
                }
              >
                {label}
              </span>
            </div>
          ))}
        </nav>
      </LayoutCommon>
    </div>
  );
};

export default Breadcrumb;
