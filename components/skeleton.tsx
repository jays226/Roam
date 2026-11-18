export function Skeleton({className=''}:{className?:string}){return <div aria-hidden="true" className={`skeleton ${className}`}/>}

export function TripListSkeleton(){return <div className="skeleton-stack" aria-label="Loading trips"><Skeleton className="skeleton-heading"/><Skeleton className="skeleton-card"/><Skeleton className="skeleton-card"/></div>}

export function PlanSkeleton(){return <div className="skeleton-stack" aria-label="Loading trip plan"><Skeleton className="skeleton-heading"/><Skeleton className="skeleton-card"/><Skeleton className="skeleton-card"/><Skeleton className="skeleton-card skeleton-short"/></div>}
