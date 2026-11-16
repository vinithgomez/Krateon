<#
.SYNOPSIS
  Loads starter data (categories, warehouses, suppliers, products, size variants, stock) into a
  running Krateon backend through its admin API.

.DESCRIPTION
  Safe to re-run: anything that already exists (matched by name / size) is skipped.
  You are asked for your admin email and password at run time; nothing is stored or logged.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\seed-production.ps1
  powershell -ExecutionPolicy Bypass -File scripts\seed-production.ps1 -ApiUrl http://localhost:8080
#>
param(
  [string]$ApiUrl = 'https://krateon-api.onrender.com',
  [int]$InitialStock = 50,
  [int]$LowStockThreshold = 10
)
$ErrorActionPreference = 'Stop'
$ApiUrl = $ApiUrl.TrimEnd('/')

# ---- starter data --------------------------------------------------------------------------
$unsplash = { param($id) "https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80" }
$apparel = 'S', 'M', 'L', 'XL'
$bottoms = 'M', 'L', 'XL', 'XXL'

$categories = @(
  @{ name = 'T-Shirts';  description = 'Everyday cotton tees' },
  @{ name = 'Hoodies';   description = 'Warm fleece hoodies' },
  @{ name = 'Jeans';     description = 'Denim in modern fits' },
  @{ name = 'Jackets';   description = 'Outerwear for every season' },
  @{ name = 'Sneakers';  description = 'Casual and sport footwear' }
)
$warehouses = @(
  @{ name = 'Mumbai Central Warehouse';    location = 'Mumbai, MH' },
  @{ name = 'Delhi North Warehouse';       location = 'Delhi, DL' },
  @{ name = 'Bengaluru South Warehouse';   location = 'Bengaluru, KA' }
)
$suppliers = @(
  @{ name = 'Threadline Textiles';    contactEmail = 'orders@threadline.example';   contactPhone = '+91 98000 00001' },
  @{ name = 'Urban Denim Co';         contactEmail = 'sales@urbandenim.example';    contactPhone = '+91 98000 00002' },
  @{ name = 'StrideWorks Footwear';   contactEmail = 'supply@strideworks.example';  contactPhone = '+91 98000 00003' }
)
$products = @(
  @{ name = 'Classic White Tee';        cat = 'T-Shirts'; price = 499;  sizes = $apparel; photo = '1778671394516-8270eac13c42'; description = 'Soft 100% cotton crew-neck tee.' },
  @{ name = 'Graphic Black Tee';        cat = 'T-Shirts'; price = 599;  sizes = $apparel; photo = '1763550347126-6764c39e2c7b'; description = 'Relaxed-fit tee with a bold back print.' },
  @{ name = 'Striped Cotton Tee';       cat = 'T-Shirts'; price = 549;  sizes = $apparel; photo = '1591224615614-e300d72e37c5'; description = 'Breton stripes, breathable weave.' },
  @{ name = 'Essential Pullover Hoodie';cat = 'Hoodies';  price = 1499; sizes = $apparel; photo = '1620799140188-3b2a02fd9a77'; description = 'Midweight fleece pullover hoodie.' },
  @{ name = 'Zip-Up Hoodie';            cat = 'Hoodies';  price = 1699; sizes = $apparel; photo = '1577944600010-48421c42c1c4'; description = 'Full-zip hoodie with kangaroo pockets.' },
  @{ name = 'Slim Fit Blue Jeans';      cat = 'Jeans';    price = 1799; sizes = $bottoms; photo = '1714143136372-ddaf8b606da7'; description = 'Stretch denim, slim through the leg.' },
  @{ name = 'Straight Fit Black Jeans'; cat = 'Jeans';    price = 1899; sizes = $bottoms; photo = '1516271099866-de31ba93ee4b'; description = 'Classic straight cut in washed black.' },
  @{ name = 'Denim Trucker Jacket';     cat = 'Jackets';  price = 2499; sizes = $apparel; photo = '1675442141177-b99b70652416'; description = 'Timeless denim jacket with button front.' },
  @{ name = 'Lightweight Bomber';       cat = 'Jackets';  price = 2799; sizes = $apparel; photo = '1549399239-fb3c102d3d71';    description = 'Water-resistant bomber for in-between weather.' },
  @{ name = 'Everyday Canvas Sneakers'; cat = 'Sneakers'; price = 1999; sizes = $apparel; photo = '1542280756-74b2f55e73ab';    description = 'Low-top canvas sneakers with cushioned sole.' },
  @{ name = 'Runner Mesh Sneakers';     cat = 'Sneakers'; price = 2999; sizes = $apparel; photo = '1562613521-6b5293e5b0ea';    description = 'Breathable mesh upper for daily runs.' }
)

# ---- helpers -------------------------------------------------------------------------------
$script:token = $null
function Call([string]$Method, [string]$Path, $Body = $null, [int]$Retries = 1) {
  $p = @{ Uri = "$ApiUrl$Path"; Method = $Method; ContentType = 'application/json'; TimeoutSec = 120 }
  if ($script:token) { $p.Headers = @{ Authorization = "Bearer $script:token" } }
  if ($null -ne $Body) { $p.Body = ($Body | ConvertTo-Json -Depth 5) }
  for ($i = 1; ; $i++) {
    try { return Invoke-RestMethod @p }
    catch {
      $detail = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
      if ($i -ge $Retries) { throw "$Method $Path failed: $detail" }
      Start-Sleep -Seconds 5
    }
  }
}

# ---- sign in -------------------------------------------------------------------------------
# Prompts by default; KRATEON_ADMIN_EMAIL / KRATEON_ADMIN_PASSWORD can be set for non-interactive runs.
if ($env:KRATEON_ADMIN_EMAIL -and $env:KRATEON_ADMIN_PASSWORD) {
  $email = $env:KRATEON_ADMIN_EMAIL
  $plain = $env:KRATEON_ADMIN_PASSWORD
} else {
  $email = Read-Host 'Admin email'
  $secure = Read-Host 'Admin password' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

Write-Host "Signing in to $ApiUrl (a sleeping free-tier backend can take up to a minute)..."
$auth = Call POST '/api/auth/login' @{ email = $email; password = $plain } 12
$plain = $null
if ($auth.role -ne 'ADMIN') { throw "This account is $($auth.role), not ADMIN. Promote it first (see DEPLOY.md)." }
$script:token = $auth.token

# ---- categories, warehouses, suppliers -----------------------------------------------------
$catIds = @{}
foreach ($c in (Call GET '/api/categories')) { $catIds[$c.name] = $c.id }
foreach ($c in $categories) {
  if (-not $catIds.ContainsKey($c.name)) {
    $catIds[$c.name] = (Call POST '/api/admin/categories' $c).id
    Write-Host "  + category $($c.name)"
  }
}

$whIds = @{}
foreach ($w in (Call GET '/api/admin/warehouses')) { $whIds[$w.name] = $w.id }
foreach ($w in $warehouses) {
  if (-not $whIds.ContainsKey($w.name)) {
    $whIds[$w.name] = (Call POST '/api/admin/warehouses' $w).id
    Write-Host "  + warehouse $($w.name)"
  }
}
$whOrder = $warehouses | ForEach-Object { $whIds[$_.name] }

$existingSuppliers = @((Call GET '/api/admin/suppliers') | ForEach-Object { $_.name })
foreach ($s in $suppliers) {
  if ($existingSuppliers -notcontains $s.name) {
    Call POST '/api/admin/suppliers' $s | Out-Null
    Write-Host "  + supplier $($s.name)"
  }
}

# ---- products, variants, stock -------------------------------------------------------------
$existing = @{}
foreach ($p in (Call GET '/api/admin/products?size=200').content) { $existing[$p.name] = $p }

$n = 0
foreach ($p in $products) {
  $prod = $existing[$p.name]
  if (-not $prod) {
    $prod = Call POST '/api/admin/products' @{
      name = $p.name; description = $p.description; price = $p.price
      imageUrl = (& $unsplash $p.photo); categoryId = $catIds[$p.cat]
    }
    Write-Host "  + product $($p.name)"
  }

  $haveSizes = @((Call GET "/api/admin/products/$($prod.id)/variants") | ForEach-Object { $_.size })
  foreach ($sz in $p.sizes) {
    if ($haveSizes -notcontains $sz) { Call POST "/api/admin/products/$($prod.id)/variants" @{ size = $sz } | Out-Null }
  }

  $variants = Call GET "/api/admin/products/$($prod.id)/variants"
  $stocked = @((Call GET "/api/admin/inventory/product/$($prod.id)") | ForEach-Object { $_.productVariantId })
  foreach ($v in $variants) {
    if ($stocked -notcontains $v.id) {
      $wh = $whOrder[$n % $whOrder.Count]; $n++
      Call POST '/api/admin/inventory' @{
        productVariantId = $v.id; warehouseId = $wh
        quantity = $InitialStock; lowStockThreshold = $LowStockThreshold
      } | Out-Null
    }
  }
}

Write-Host ''
Write-Host "Done. Categories: $($catIds.Count), warehouses: $($whIds.Count), products: $($products.Count)."
Write-Host 'Reload the storefront; the product list may take up to 10 minutes to refresh from cache.'
