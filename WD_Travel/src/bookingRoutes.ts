interface BookingRouteOptions {
  origin: string;
  destination: string;
  tripType: 'ONE_WAY' | 'ROUND_TRIP';
  hasDifferentReturnRoute: boolean;
  returnOrigin: string;
  returnDestination: string;
}

export const formatBookingRoute = ({
  origin,
  destination,
  tripType,
  hasDifferentReturnRoute,
  returnOrigin,
  returnDestination
}: BookingRouteOptions) => {
  const outboundRoute = `${origin} ➔ ${destination}`;
  if (tripType !== 'ROUND_TRIP') return outboundRoute;
  if (hasDifferentReturnRoute) return `${outboundRoute} / ${returnOrigin} ➔ ${returnDestination}`;
  return `${outboundRoute} ➔ ${origin}`;
};
