export const surveyStats = {
    totalResponses: 56,
    ageGroups: [
        { label: '18–35', count: 30, percentage: 53.6 },
        { label: '36–45', count: 17, percentage: 30.4 },
        { label: '46+', count: 9, percentage: 16.1 }
    ],
    vehicleTypes: [
        { label: 'Motorbike', count: 16 },
        { label: 'Three-wheel', count: 13 },
        { label: 'Car or Van', count: 22 },
        { label: 'Other', count: 5 }
    ],
    registrationMethod: [
        { label: 'Self Online', count: 36 },
        { label: 'With Help', count: 17 },
        { label: 'At Station', count: 2 },
        { label: 'Not Registered', count: 1 }
    ],
    easeOfRegistration: [
        { value: 1, count: 6 },
        { value: 2, count: 6 },
        { value: 3, count: 18 },
        { value: 4, count: 9 },
        { value: 5, count: 17 }
    ],
    impactOnQueues: [
        { label: 'Significant Reduction', count: 23, color: '#10b981' },
        { label: 'Slight Reduction', count: 16, color: '#34d399' },
        { label: 'No Difference', count: 11, color: '#94a3b8' },
        { label: 'Made it Worse', count: 6, color: '#ef4444' }
    ],
    hoardingPrevention: [
        { label: 'Effectively Prevented', count: 29, status: 'Yes' },
        { label: 'Did Not Prevent', count: 4, status: 'No' },
        { label: 'Not Sure', count: 23, status: 'Not Sure' }
    ],
    overallEffectiveness: [
        { value: 1, count: 6 },
        { value: 2, count: 6 },
        { value: 3, count: 12 },
        { value: 4, count: 12 },
        { value: 5, count: 20 }
    ],
    commonTechnicalIssues: [
        { label: 'Website Errors', count: 9 },
        { label: 'Verification Problems', count: 9 },
        { label: 'Did not receive QR', count: 5 },
        { label: 'Scanner Failures', count: 4 }
    ],
    userSuggestions: [
        "Include easier registration for elderly people who face technology barriers.",
        "Provide real-time fuel availability updates to reduce unnecessary travel.",
        "Integrate vehicle and national ID verification for fairer distribution.",
        "Add fuel reservation time slots and notification alerts.",
        "Improve system stability to prevent website errors during high traffic."
    ]
};
