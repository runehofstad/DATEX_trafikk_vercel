function calculateTravelData(traveltimes, stretchData) {
  // Create a dictionary for quick lookup by location_id
  const timeDict = traveltimes.reduce((acc, entry) => {
    acc[entry.location_id] = entry;
    return acc;
  }, {});

  // Function to convert seconds to minutes string
  function convertSecondsToMinutesString(seconds) {
    let minutes = Math.round(seconds / 60);
    return minutes;
  }

  return stretchData.map((stretch) => {
    let timeNow = 0;
    let timeNormal = 0;

    stretch.stretchIDs.forEach((locId) => {
      if (timeDict[locId]) {
        // If travel_time is missing, set it to free_flow_time
        const freeFlowTime = Math.trunc(
          parseFloat(timeDict[locId].free_flow_time || 0)
        );
        const travelTime = Math.trunc(
          parseFloat(timeDict[locId].travel_time || freeFlowTime)
        ); // Use freeFlowTime if travel_time is missing

        timeNow += travelTime;
        timeNormal += freeFlowTime;
      }
    });

    const delay = timeNow - timeNormal;

    return {
      id: stretch.id,
      stretch: stretch.stretch,
      time_now: convertSecondsToMinutesString(timeNow), // Convert time_now to minutes
      time_normal: convertSecondsToMinutesString(timeNormal), // Convert time_normal to minutes
      delay: convertSecondsToMinutesString(delay), // Convert delay to minutes
      time_now_seconds: timeNow, // Time normal in seconds
      time_normal_seconds: timeNormal, // Time now in seconds
      delay_seconds: delay, // Delay in seconds
    };
  });
}

module.exports = {
  calculateTravelData,
};

/*
TESTING CODE:
const traveltimes = [
  {
    location_id: "100153",
    travel_time: "109.0",
    free_flow_time: "120.0",
    travel_time_trend_type: "stable",
  },
  {
    location_id: "100156",
    travel_time: "129.0",
    free_flow_time: "120.0",
    travel_time_trend_type: "stable",
  },
  {
    location_id: "100173",
    travel_time: "184.0",
    free_flow_time: "180.0",
    travel_time_trend_type: "stable",
  },
  {
    location_id: "100176",
    travel_time: "189.0",
    free_flow_time: "180.0",
    travel_time_trend_type: "stable",
  },
  { location_id: "100275", free_flow_time: "120.0" },
  {
    location_id: "100274",
    travel_time: "122.0",
    free_flow_time: "120.0",
    travel_time_trend_type: "stable",
  },
  {
    location_id: "100277",
    travel_time: "126.0",
    free_flow_time: "120.0",
    travel_time_trend_type: "stable",
  },
  { location_id: "100276", free_flow_time: "120.0" },
];

const stretch_data = [
  {
    id: 1,
    stretch: "Straume - Lyderhorntunnelen",
    stretchIDs: ["100277", "100176", "100156"],
  },
  {
    id: 2,
    stretch: "Lyderhorntunnelen - Straume",
    stretchIDs: ["100153", "100173", "100274"],
  },
  { id: 3, stretch: "Kolltveittunnelen - Straume", stretchIDs: ["100276"] },
  { id: 4, stretch: "Straume - Kolltveittunnelen", stretchIDs: ["100275"] },
];

const newStretchData = calculateTravelData(traveltimes, stretch_data);
console.log(newStretchData);

*/
