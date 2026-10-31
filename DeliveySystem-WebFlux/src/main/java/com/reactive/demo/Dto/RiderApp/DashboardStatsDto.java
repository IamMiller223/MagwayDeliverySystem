package com.reactive.demo.Dto.RiderApp;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardStatsDto {
    private long activeCount;
    private long completedCount;
}
