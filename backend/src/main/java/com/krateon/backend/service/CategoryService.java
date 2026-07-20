package com.krateon.backend.service;

import com.krateon.backend.dto.CategoryRequest;
import com.krateon.backend.dto.CategoryResponse;
import com.krateon.backend.entity.Category;
import com.krateon.backend.exception.ResourceNotFoundException;
import com.krateon.backend.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryService {

    private static final String ALL_CATEGORIES_KEY = "'all'";

    private final CategoryRepository categoryRepository;

    @CacheEvict(value = "categories", key = ALL_CATEGORIES_KEY)
    public CategoryResponse create(CategoryRequest request) {
        Category category = Category.builder()
                .name(request.getName())
                .description(request.getDescription())
                .build();

        return toResponse(categoryRepository.save(category));
    }

    @Caching(evict = {
            @CacheEvict(value = "categories", key = "#id"),
            @CacheEvict(value = "categories", key = ALL_CATEGORIES_KEY)
    })
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = findCategoryOrThrow(id);
        category.setName(request.getName());
        category.setDescription(request.getDescription());

        return toResponse(categoryRepository.save(category));
    }

    @Caching(evict = {
            @CacheEvict(value = "categories", key = "#id"),
            @CacheEvict(value = "categories", key = ALL_CATEGORIES_KEY)
    })
    public void delete(Long id) {
        Category category = findCategoryOrThrow(id);
        categoryRepository.delete(category);
    }

    @Cacheable(value = "categories", key = "#id")
    public CategoryResponse getById(Long id) {
        log.info("CACHE MISS - loading category {} from the database", id);
        return toResponse(findCategoryOrThrow(id));
    }

    @Cacheable(value = "categories", key = ALL_CATEGORIES_KEY, sync = true)
    public List<CategoryResponse> getAll() {
        log.info("CACHE MISS - loading all categories from the database");
        return categoryRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    private Category findCategoryOrThrow(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
    }

    private CategoryResponse toResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .build();
    }

}
