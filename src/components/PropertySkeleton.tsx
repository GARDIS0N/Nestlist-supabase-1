import React from "react";

interface PropertySkeletonProps {
  count?: number;
  showActions?: boolean;
}

export const PropertySkeleton: React.FC<PropertySkeletonProps> = ({
  count = 3,
  showActions = true,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full animate-pulse">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white border border-[#E2EAE6] rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm"
        >
          {/* Media / Image Placeholder */}
          <div className="relative aspect-video w-full bg-stone-200 flex flex-col justify-between p-3">
            {/* Top Row Badges */}
            <div className="flex justify-between items-center w-full">
              {/* Active / Status Badge */}
              <div className="h-5 bg-stone-300 rounded-full w-20"></div>
              {/* Views / Verification Badge */}
              <div className="h-5 bg-stone-300 rounded-full w-16"></div>
            </div>

            {/* Bottom Overlay (Price) */}
            <div className="self-end h-6 bg-stone-300 rounded w-28 mt-auto"></div>
          </div>

          {/* Content Area */}
          <div className="p-5 flex flex-col flex-1 space-y-3.5">
            {/* Location Line */}
            <div className="flex items-center space-x-1.5">
              <div className="h-3.5 w-3.5 rounded-full bg-stone-200 shrink-0"></div>
              <div className="h-3.5 bg-stone-200 rounded w-1/2"></div>
            </div>

            {/* Title Line */}
            <div className="flex items-center justify-between gap-3">
              <div className="h-5.5 bg-stone-300 rounded w-3/4"></div>
              <div className="h-4 bg-stone-200 rounded-full w-10 shrink-0"></div>
            </div>

            {/* Description Lines */}
            <div className="space-y-1.5 pt-1">
              <div className="h-3 bg-stone-100 rounded w-full"></div>
              <div className="h-3 bg-stone-100 rounded w-5/6"></div>
            </div>

            {/* Metadata / Amenities Tags */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              <div className="h-5 bg-stone-200 rounded-full w-16"></div>
              <div className="h-5 bg-stone-200 rounded-full w-20"></div>
              <div className="h-5 bg-stone-200 rounded-full w-14"></div>
            </div>

            {/* Price Line/Footer */}
            <div className="pt-4 border-t border-[#E2EAE6] mt-auto flex items-center justify-between">
              <div className="h-6 bg-stone-200 rounded w-24"></div>
              <div className="h-4 bg-stone-200 rounded w-16"></div>
            </div>
          </div>

          {/* Actions Row (Conditional for Landlord Dashboard / Manage view) */}
          {showActions && (
            <div className="p-4 pt-0 border-t border-stone-100 bg-stone-50/50 flex flex-wrap items-center gap-2">
              <div className="flex-1 min-h-[44px] bg-stone-200 rounded-lg"></div>
              <div className="flex-1 min-h-[44px] bg-stone-200 rounded-lg"></div>
              <div className="flex-1 min-h-[44px] bg-stone-200 rounded-lg"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
