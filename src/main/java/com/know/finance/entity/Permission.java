package com.know.finance.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Permission {
    private Long id;
    private String permissionCode;
    private String permissionName;
    private String resourceType;
    private String resourceUrl;
    private Long parentId;
    private Integer sortOrder;
    private String authType;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Integer deleted;
}
