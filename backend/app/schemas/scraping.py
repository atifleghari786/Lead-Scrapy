import uuid
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl


class ExtractionField(BaseModel):
    field_name: str
    selector_type: str = Field(pattern="^(css|xpath|regex)$")
    selector: str
    attribute: str | None = None  # e.g. "href", "src", or None for text content


class ScrapeJobCreate(BaseModel):
    name: str
    target_url: str
    max_pages: int = 50
    crawl_depth: int = 2
    same_domain_only: bool = True
    include_patterns: list[str] | None = None
    exclude_patterns: list[str] | None = None
    respect_robots_txt: bool = True
    request_delay_ms: int = 800
    extraction_fields: list[ExtractionField] = []
    template_id: uuid.UUID | None = None


class ScrapeJobOut(BaseModel):
    id: uuid.UUID
    name: str
    target_url: str
    status: str
    pages_processed: int
    records_found: int
    errors_count: int
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class LeadOut(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    company_name: str | None
    website_url: str | None
    email: str | None
    phone: str | None
    address: str | None
    category: str | None
    social_links: dict | list | None
    page_title: str | None
    description: str | None
    source_url: str
    custom_fields: dict | None
    tags: list | None
    notes: str | None
    status: str
    is_favorite: bool
    scraped_at: datetime

    class Config:
        from_attributes = True


class LeadUpdate(BaseModel):
    tags: list[str] | None = None
    notes: str | None = None
    status: str | None = None
    is_favorite: bool | None = None


class SocialExtractCreate(BaseModel):
    url: str


class PlacesFindCreate(BaseModel):
    query: str
    location: str


class EmailFindCreate(BaseModel):
    domain: str


class ScrapeTemplateCreate(BaseModel):
    name: str
    description: str | None = None
    config: dict


class ScrapeTemplateOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    config: dict
    created_at: datetime

    class Config:
        from_attributes = True
