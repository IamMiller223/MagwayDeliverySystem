package com.reactive.demo.Dto.AdminApp;


import lombok.Builder;
import lombok.Data;
import java.util.List;

import com.reactive.demo.Dto.AdminOrderListDto;

@Data
@Builder
public class AdminOrderPageResponseDto {
    private long totalElements;
    private int totalPages;
    private int currentPage;
    private List<AdminOrderListDto> orders;
}
