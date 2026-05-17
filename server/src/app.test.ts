import bcrypt from 'bcryptjs';
import PizZip from 'pizzip';
import sharp from 'sharp';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ChangeRequestStatus, OrderStatus, ProductStatus, ProductType, ProjectProductDeliveryMethod, ProjectStatus, UserRole } from '@prisma/client';
import { createApp } from './app';
import { generateProposalPptx } from './documents/projectDocuments';
import type { AppConfig, DatabaseClient, StorageService } from './types';

const config: AppConfig = {
  nodeEnv: 'test',
  port: 4000,
  databaseUrl: 'postgresql://test:test@localhost:5432/test',
  jwtAccessSecret: 'test_access_secret_that_is_long_enough_123',
  jwtRefreshSecret: 'test_refresh_secret_that_is_long_enough_123',
  jwtAccessExpiresIn: '15m',
  jwtRefreshExpiresIn: '7d',
  s3Endpoint: 'http://localhost:9000',
  s3Region: 'ap-northeast-1',
  s3Bucket: 'proposal-management-dev',
  s3AccessKeyId: 'test',
  s3SecretAccessKey: 'test',
  s3ForcePathStyle: true,
  maxUploadBytes: 10 * 1024 * 1024,
};

describe('foundation API', () => {
  it('returns health status', async () => {
    const app = createApp(createTestDependencies());

    await request(app)
      .get('/api/health')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 'ok',
          service: 'proposal-management-api',
        });
      });
  });

  it('logs in seeded admin and rejects wrong password', async () => {
    const app = createApp(await createTestDependenciesWithPassword('Correct123!'));

    const success = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Correct123!' })
      .expect(200);

    expect(success.body.user).toMatchObject({
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });
    expect(success.body.accessToken).toEqual(expect.any(String));
    expect(success.body.refreshToken).toEqual(expect.any(String));

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Wrong123!' })
      .expect(401);
  });

  it('protects /api/auth/me', async () => {
    const app = createApp(await createTestDependenciesWithPassword('Correct123!'));

    await request(app).get('/api/auth/me').expect(401);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Correct123!' })
      .expect(200);

    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.user.email).toBe('admin@example.com');
      });
  });

  it('validates supplier and client payloads', async () => {
    const app = createApp(await createTestDependenciesWithPassword('Correct123!'));
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Correct123!' });
    const auth = `Bearer ${login.body.accessToken}`;

    await request(app)
      .post('/api/suppliers')
      .set('Authorization', auth)
      .send({ name: '', contactName: 'Owner', email: 'not-an-email' })
      .expect(400);

    await request(app)
      .post('/api/clients')
      .set('Authorization', auth)
      .send({ name: 'Client', contactName: '', email: 'bad-email' })
      .expect(400);
  });

  it('lets product managers view master data but blocks catalog and master mutations', async () => {
    const app = createApp(await createTestDependenciesWithPassword('Correct123!'));
    const productManagerAuth = await getProductManagerAuthHeader(app);

    await request(app).get('/api/products').set('Authorization', productManagerAuth).expect(200);
    await request(app).get('/api/suppliers').set('Authorization', productManagerAuth).expect(200);
    await request(app).get('/api/clients').set('Authorization', productManagerAuth).expect(200);

    await request(app)
      .post('/api/products')
      .set('Authorization', productManagerAuth)
      .send({
        name: 'Blocked Product',
        description: 'Should not be created by product manager',
        categoryName: 'Blocked',
        janCode: 'pm-blocked-jan',
        productType: ProductType.WAREHOUSE,
        cost: 100,
        listPrice: 200,
        minLot: 1,
        leadTime: '7 days',
        supplierId: 'supplier-1',
      })
      .expect(403);

    await request(app)
      .patch('/api/products/product-seeded')
      .set('Authorization', productManagerAuth)
      .send({ description: 'Blocked update' })
      .expect(403);

    await request(app)
      .delete('/api/products/product-seeded')
      .set('Authorization', productManagerAuth)
      .expect(403);

    await request(app)
      .post('/api/products/product-seeded/approve')
      .set('Authorization', productManagerAuth)
      .expect(403);

    await request(app)
      .post('/api/suppliers')
      .set('Authorization', productManagerAuth)
      .send({ name: 'Blocked Supplier', contactName: 'Owner', email: 'blocked@example.com' })
      .expect(403);

    await request(app)
      .patch('/api/clients/client-1')
      .set('Authorization', productManagerAuth)
      .send({ name: 'Blocked Client' })
      .expect(403);
  });

  it('rejects unauthenticated file presign requests', async () => {
    const app = createApp(createTestDependencies());

    await request(app)
      .post('/api/files/presign-upload')
      .send({
        fileName: 'spec.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      })
      .expect(401);
  });

  it('creates, lists, requests approval, approves, and soft deletes products', async () => {
    const app = createApp(await createTestDependenciesWithPassword('Correct123!'));
    const auth = await getAuthHeader(app);

    const created = await request(app)
      .post('/api/products')
      .set('Authorization', auth)
      .send({
        name: 'Sample Product',
        description: 'Initial description',
        categoryName: 'Samples',
        janCode: '1234567890123',
        productType: ProductType.WAREHOUSE,
        cost: 100,
        listPrice: 250,
        minLot: 1,
        leadTime: '7 days',
        supplierId: 'supplier-1',
        imageUrl: 'https://example.com/product.jpg',
      })
      .expect(201);

    expect(created.body.product).toMatchObject({
      name: 'Sample Product',
      supplierName: 'Supplier One',
      categoryName: 'Samples',
      cost: 100,
      listPrice: 250,
      images: ['https://example.com/product.jpg'],
    });

    await request(app)
      .get('/api/products/jan-code-availability')
      .query({ janCode: '1234567890123' })
      .set('Authorization', auth)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          available: false,
          product: {
            id: created.body.product.id,
            name: 'Sample Product',
            janCode: '1234567890123',
            deleted: false,
          },
        });
      });

    await request(app)
      .get('/api/products/jan-code-availability')
      .query({ janCode: '1234567890123', excludeProductId: created.body.product.id })
      .set('Authorization', auth)
      .expect(200)
      .expect((response) => {
        expect(response.body.available).toBe(true);
      });

    await request(app)
      .post('/api/products')
      .set('Authorization', auth)
      .send({
        name: 'Missing Supplier Product',
        description: 'Invalid supplier input',
        categoryName: 'Samples',
        janCode: 'missing-supplier-jan',
        productType: ProductType.WAREHOUSE,
        cost: 100,
        listPrice: 250,
        minLot: 1,
        leadTime: '7 days',
        supplierId: '',
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.error.code).toBe('SUPPLIER_REQUIRED');
      });

    await request(app)
      .post('/api/products')
      .set('Authorization', auth)
      .send({
        name: 'Unknown Supplier Product',
        description: 'Invalid supplier input',
        categoryName: 'Samples',
        janCode: 'unknown-supplier-jan',
        productType: ProductType.WAREHOUSE,
        cost: 100,
        listPrice: 250,
        minLot: 1,
        leadTime: '7 days',
        supplierId: 'supplier-missing',
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.error.code).toBe('SUPPLIER_NOT_FOUND');
      });

    const updated = await request(app)
      .patch(`/api/products/${created.body.product.id}`)
      .set('Authorization', auth)
      .send({ cost: 125, listPrice: 275, description: 'Pending description' })
      .expect(200);

    expect(updated.body.product.status).toBe(ProductStatus.PENDING_APPROVAL);
    expect(updated.body.product.cost).toBe(100);
    expect(updated.body.product.pendingChange.fieldDiffs.map((diff: { label: string }) => diff.label)).toEqual([
      '原価',
      '小売価格',
      '商品説明',
    ]);

    const approved = await request(app)
      .post(`/api/products/${created.body.product.id}/approve`)
      .set('Authorization', auth)
      .expect(200);

    expect(approved.body.product).toMatchObject({
      status: ProductStatus.ACTIVE,
      cost: 125,
      listPrice: 275,
    });

    await request(app)
      .delete(`/api/products/${created.body.product.id}`)
      .set('Authorization', auth)
      .expect(204);

    const list = await request(app).get('/api/products').set('Authorization', auth).expect(200);
    expect(list.body.products.some((product: { id: string }) => product.id === created.body.product.id)).toBe(false);
  });

  it('lets supplier create own product and upload normalized images', async () => {
    const dependencies = await createTestDependenciesWithPassword('Correct123!');
    const app = createApp(dependencies);
    const supplierAuth = await getSupplierAuthHeader(app);

    const created = await request(app)
      .post('/api/products')
      .set('Authorization', supplierAuth)
      .send({
        name: 'Supplier Uploaded Product',
        description: 'Created by supplier',
        categoryName: 'Supplier Category',
        janCode: 'supplier-upload-jan',
        productType: ProductType.WAREHOUSE,
        cost: 120,
        listPrice: 300,
        minLot: 1,
        leadTime: '5 days',
      })
      .expect(201);

    expect(created.body.product.supplierId).toBe('supplier-1');
    expect(created.body.product.listPrice).toBe(120);

    const updated = await request(app)
      .patch(`/api/products/${created.body.product.id}`)
      .set('Authorization', supplierAuth)
      .send({
        name: 'Supplier Uploaded Product Updated',
        description: 'Updated by supplier',
        categoryName: 'Supplier Category',
        janCode: 'supplier-upload-jan',
        productType: ProductType.WAREHOUSE,
        cost: 140,
        listPrice: 999,
        minLot: 1,
        leadTime: '5 days',
      })
      .expect(200);
    expect(updated.body.product.cost).toBe(120);
    expect(updated.body.product.pendingChange.fieldDiffs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: '原価', after: '¥140' }),
        expect.objectContaining({ label: '小売価格', after: '¥140' }),
      ]),
    );

    await request(app)
      .post(`/api/products/${created.body.product.id}/images`)
      .set('Authorization', supplierAuth)
      .attach('images', await createTestImage(), { filename: '商品 front.png', contentType: 'image/png' })
      .expect(201)
      .expect((response) => {
        expect(response.body.images).toHaveLength(1);
        expect(response.body.images[0].mimeType).toBe('image/jpeg');
      });

    await request(app)
      .post(`/api/products/${created.body.product.id}/images`)
      .set('Authorization', supplierAuth)
      .attach('images', await createTestImage(), { filename: 'fallback-upload.bin', contentType: 'application/octet-stream' })
      .expect(201)
      .expect((response) => {
        expect(response.body.images).toHaveLength(1);
        expect(response.body.images[0].mimeType).toBe('image/jpeg');
      });

    const pendingList = await request(app).get('/api/products').set('Authorization', supplierAuth).expect(200);
    const pendingProduct = pendingList.body.products.find((product: { id: string }) => product.id === created.body.product.id);
    expect(pendingProduct.pendingChange.imageDiffs).toHaveLength(2);

    expect(dependencies.storage.objects.some((object) => object.contentType === 'image/jpeg')).toBe(true);

    await request(app)
      .post(`/api/products/${created.body.product.id}/images`)
      .set('Authorization', supplierAuth)
      .attach('images', Buffer.from('not an image'), { filename: 'bad.txt', contentType: 'text/plain' })
      .expect(400)
      .expect((response) => {
        expect(response.body.error.code).toBe('UNSUPPORTED_IMAGE_TYPE');
        expect(response.body.error.message).toBe('Only JPEG, PNG, and WebP images are supported.');
        expect(response.body.error.details.rejected[0].fileName).toBe('bad.txt');
      });
  });

  it('creates, lists, updates, and soft deletes projects with totals', async () => {
    const app = createApp(await createTestDependenciesWithPassword('Correct123!'));
    const auth = await getAuthHeader(app);

    const created = await request(app)
      .post('/api/projects')
      .set('Authorization', auth)
      .send({
        title: 'Sample Project',
        clientId: 'client-1',
        status: ProjectStatus.DRAFT,
        products: [
          {
            productId: 'product-seeded',
            proposalComment: 'Good fit',
            cost: 100,
            sellingPrice: 250,
            quantity: 3,
            isAdopted: false,
            deliveryMethod: ProjectProductDeliveryMethod.DIRECT,
          },
        ],
      })
      .expect(201);

    expect(created.body.project).toMatchObject({
      title: 'Sample Project',
      clientName: 'Client One',
      totalRevenue: 750,
      totalProfit: 450,
    });
    expect(created.body.project.products[0]).toMatchObject({
      deliveryMethod: ProjectProductDeliveryMethod.DIRECT,
    });

    const draft = await request(app)
      .post('/api/projects')
      .set('Authorization', auth)
      .send({
        title: 'Draft Project',
        clientId: 'client-1',
        status: ProjectStatus.DRAFT,
        products: [],
      })
      .expect(201);
    expect(draft.body.project).toMatchObject({
      title: 'Draft Project',
      totalRevenue: 0,
      totalProfit: 0,
      products: [],
    });

    const updated = await request(app)
      .patch(`/api/projects/${created.body.project.id}`)
      .set('Authorization', auth)
      .send({
        title: 'Updated Project',
        products: [
          {
            productId: 'product-seeded',
            proposalComment: 'Updated',
            cost: 100,
            sellingPrice: 300,
            quantity: 2,
            isAdopted: true,
            allowOrder: false,
            deliveryMethod: ProjectProductDeliveryMethod.WAREHOUSE,
          },
        ],
      })
      .expect(200);

    expect(updated.body.project).toMatchObject({
      title: 'Updated Project',
      totalRevenue: 600,
      totalProfit: 400,
    });
    expect(updated.body.project.orderRequests).toHaveLength(0);

    const orderReady = await request(app)
      .patch(`/api/projects/${created.body.project.id}`)
      .set('Authorization', auth)
      .send({
        status: ProjectStatus.ADOPTED,
        products: [
          {
            productId: 'product-seeded',
            proposalComment: 'Ready for order',
            cost: 100,
            sellingPrice: 300,
            quantity: 2,
            isAdopted: true,
            allowOrder: true,
            deliveryMethod: ProjectProductDeliveryMethod.WAREHOUSE,
          },
        ],
      })
      .expect(200);
    expect(orderReady.body.project.orderRequests).toHaveLength(1);
    const orderId = orderReady.body.project.orderRequests[0].id;
    const supplierAuth = await getSupplierAuthHeader(app);
    const productManagerAuth = await getProductManagerAuthHeader(app);
    const requestedNotifications = await request(app)
      .get('/api/notifications')
      .set('Authorization', supplierAuth)
      .expect(200);
    expect(requestedNotifications.body.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'ORDER_REQUESTED',
          projectId: created.body.project.id,
          orderId,
          read: false,
        }),
      ]),
    );

    const shipped = await request(app)
      .patch(`/api/projects/${created.body.project.id}/orders/${orderId}/status`)
      .set('Authorization', supplierAuth)
      .send({ status: OrderStatus.SHIPPED })
      .expect(200);
    expect(shipped.body.orderRequest.status).toBe(OrderStatus.SHIPPED);
    const managerNotifications = await request(app)
      .get('/api/notifications')
      .set('Authorization', productManagerAuth)
      .expect(200);
    expect(managerNotifications.body.unreadCount).toBe(1);
    expect(managerNotifications.body.notifications[0]).toMatchObject({
      type: 'ORDER_SHIPPED',
      projectId: created.body.project.id,
      orderId,
      read: false,
    });

    await request(app)
      .patch(`/api/projects/${created.body.project.id}/orders/${orderId}/status`)
      .set('Authorization', supplierAuth)
      .send({ status: OrderStatus.RECEIVED })
      .expect(400);

    const received = await request(app)
      .patch(`/api/projects/${created.body.project.id}/orders/${orderId}/status`)
      .set('Authorization', productManagerAuth)
      .send({ status: OrderStatus.RECEIVED })
      .expect(200);
    expect(received.body.orderRequest.status).toBe(OrderStatus.RECEIVED);
    const supplierNotifications = await request(app)
      .get('/api/notifications')
      .set('Authorization', supplierAuth)
      .expect(200);
    const receivedNotification = supplierNotifications.body.notifications.find(
      (notification: { type: string }) => notification.type === 'ORDER_RECEIVED',
    );
    expect(receivedNotification).toMatchObject({
      type: 'ORDER_RECEIVED',
      projectId: created.body.project.id,
      orderId,
      read: false,
    });
    await request(app)
      .post(`/api/notifications/${receivedNotification.id}/read`)
      .set('Authorization', supplierAuth)
      .expect(200)
      .expect((response) => {
        expect(response.body.notification.read).toBe(true);
      });

    await request(app)
      .delete(`/api/projects/${created.body.project.id}`)
      .set('Authorization', auth)
      .expect(204);

    const list = await request(app).get('/api/projects').set('Authorization', auth).expect(200);
    expect(list.body.projects).toHaveLength(1);
    expect(list.body.projects[0].id).toBe(draft.body.project.id);
  });

  it('manages users as admin and scopes sales projects to assigned records', async () => {
    const app = createApp(await createTestDependenciesWithPassword('Correct123!'));
    const auth = await getAuthHeader(app);

    const usersList = await request(app)
      .get('/api/users')
      .set('Authorization', auth)
      .expect(200);
    expect(usersList.body.users.some((user: { role: string }) => user.role === 'SALES')).toBe(true);

    const createdUser = await request(app)
      .post('/api/users')
      .set('Authorization', auth)
      .send({
        name: 'Sales Two',
        email: 'sales.two@example.com',
        role: 'SALES',
        password: 'Correct123!',
      })
      .expect(201);
    expect(createdUser.body.user).toMatchObject({
      email: 'sales.two@example.com',
      role: 'SALES',
    });

    await request(app)
      .post(`/api/users/${createdUser.body.user.id}/reset-password`)
      .set('Authorization', auth)
      .send({ password: 'NewPassword123!' })
      .expect(204);

    const productManagerAuth = await getProductManagerAuthHeader(app);
    const productManagerUsers = await request(app)
      .get('/api/users')
      .set('Authorization', productManagerAuth)
      .expect(200);
    expect(productManagerUsers.body.users.every((user: { role: string }) => user.role === 'SALES')).toBe(true);

    await request(app)
      .get('/api/users?role=SALES')
      .set('Authorization', productManagerAuth)
      .expect(200);

    const salesAuth = await getSalesAuthHeader(app);
    await request(app)
      .get('/api/users')
      .set('Authorization', salesAuth)
      .expect(403);
    await request(app)
      .get('/api/suppliers')
      .set('Authorization', salesAuth)
      .expect(403);
    await request(app)
      .post('/api/clients')
      .set('Authorization', salesAuth)
      .send({
        name: 'Sales Hidden Client',
        contactName: 'Sales',
        email: 'sales-hidden@example.com',
      })
      .expect(403);

    const assigned = await request(app)
      .post('/api/projects')
      .set('Authorization', productManagerAuth)
      .send({
        title: 'Assigned Project',
        clientId: 'client-1',
        assignedSalesUserId: 'user-sales',
        status: 'DRAFT',
        products: [],
      })
      .expect(201);
    expect(assigned.body.project.assignedSalesUserId).toBe('user-sales');

    await request(app)
      .post('/api/projects')
      .set('Authorization', productManagerAuth)
      .send({
        title: 'Unassigned Project',
        clientId: 'client-1',
        status: 'DRAFT',
        products: [],
      })
      .expect(201);

    const salesProjects = await request(app)
      .get('/api/projects')
      .set('Authorization', salesAuth)
      .expect(200);
    expect(salesProjects.body.projects.map((project: { title: string }) => project.title)).toEqual(['Assigned Project']);

    await request(app)
      .post('/api/projects')
      .set('Authorization', salesAuth)
      .send({
        title: 'Sales Should Not Create',
        clientId: 'client-1',
        status: 'DRAFT',
        products: [],
      })
      .expect(403);

    await request(app)
      .get('/api/exports/projects.csv')
      .set('Authorization', salesAuth)
      .expect(403);
  });

  it('lets supplier users see only projects and order notifications for their products', async () => {
    const app = createApp(await createTestDependenciesWithPassword('Correct123!'));
    const productManagerAuth = await getProductManagerAuthHeader(app);
    const supplierAuth = await getSupplierAuthHeader(app);

    await request(app)
      .post('/api/projects')
      .set('Authorization', productManagerAuth)
      .send({
        title: 'Proposal Only Supplier Project',
        clientId: 'client-1',
        status: 'PROPOSED',
        products: [
          {
            productId: 'product-seeded',
            proposalComment: 'Not ordered yet',
            cost: 100,
            sellingPrice: 250,
            quantity: 2,
            isAdopted: true,
            allowOrder: false,
          },
        ],
      })
      .expect(201);

    await request(app)
      .post('/api/projects')
      .set('Authorization', productManagerAuth)
      .send({
        title: 'Mixed Supplier Proposal',
        clientId: 'client-1',
        status: 'PROPOSED',
        products: [
          {
            productId: 'product-seeded',
            proposalComment: 'Own supplier candidate',
            cost: 100,
            sellingPrice: 250,
            quantity: 7,
            isAdopted: true,
            allowOrder: true,
            orderPlannedDate: '2026-05-20',
          },
          {
            productId: 'product-other-supplier',
            proposalComment: 'Other supplier candidate',
            cost: 80,
            sellingPrice: 200,
            quantity: 3,
            isAdopted: true,
            allowOrder: true,
            orderPlannedDate: '2026-05-21',
          },
        ],
      })
      .expect(201);

    const supplierProjects = await request(app)
      .get('/api/projects')
      .set('Authorization', supplierAuth)
      .expect(200);

    expect(supplierProjects.body.projects.map((project: { title: string }) => project.title)).not.toContain('Proposal Only Supplier Project');
    const mixedProject = supplierProjects.body.projects.find((project: { title: string }) => project.title === 'Mixed Supplier Proposal');
    expect(mixedProject).toBeTruthy();
    expect(mixedProject.products).toHaveLength(1);
    expect(mixedProject.products[0]).toMatchObject({
      productId: 'product-seeded',
      quantity: 7,
      cost: 0,
      sellingPrice: 0,
    });
    expect(mixedProject.orderRequests).toHaveLength(1);
    expect(mixedProject.orderRequests[0]).toMatchObject({
      productId: 'product-seeded',
      supplierId: 'supplier-1',
      quantity: 7,
      status: 'REQUESTED',
    });
    expect(mixedProject.totalRevenue).toBe(0);
    expect(mixedProject.totalProfit).toBe(0);
    expect(
      supplierProjects.body.projects.flatMap((project: { products: Array<{ productId: string }> }) =>
        project.products.map((product) => product.productId),
      ),
    ).not.toContain('product-other-supplier');
  });

  it('exports project and product CSV data with auth, role checks, escaping, and audit log', async () => {
    const dependencies = await createTestDependenciesWithPassword('Correct123!');
    const app = createApp(dependencies);
    const auth = await getAuthHeader(app);
    const supplierAuth = await getSupplierAuthHeader(app);

    await request(app).get('/api/exports/projects.csv').expect(401);
    await request(app)
      .get('/api/exports/product-master.csv')
      .set('Authorization', supplierAuth)
      .expect(403);

    await request(app)
      .post('/api/projects')
      .set('Authorization', auth)
      .send({
        title: 'CSV Project',
        clientId: 'client-1',
        status: ProjectStatus.ADOPTED,
        products: [
          {
            productId: 'product-seeded',
            proposalComment: 'Adopted',
            cost: 100,
            sellingPrice: 250,
            quantity: 3,
            isAdopted: true,
            companyProductCode: 'CMP-001',
            adoptionDate: '2026-05-01',
            allowPublish: true,
            allowOrder: true,
          },
        ],
      })
      .expect(201);

    const projects = await request(app)
      .get('/api/exports/projects.csv')
      .set('Authorization', auth)
      .expect(200);
    expect(projects.header['content-type']).toContain('text/csv');
    expect(projects.header['content-disposition']).toContain('projects-');
    expect(projects.text).toContain('\uFEFFproject_id,title,client_name,status,total_revenue,total_profit,product_count,adopted_product_count,created_at,updated_at');
    expect(projects.text).toContain('CSV Project');
    expect(projects.text).toContain(',750,450,1,1,');

    const productMaster = await request(app)
      .get('/api/exports/product-master.csv')
      .set('Authorization', auth)
      .expect(200);
    expect(productMaster.text).toContain('product_id,name,description,category_name,jan_code');
    expect(productMaster.text).toContain('"Seed ""Product"", 日本語"');
    expect(productMaster.text).toContain('"Seed description');
    expect(productMaster.text).toContain('with comma, and quote ""value"""');
    expect(productMaster.text).toContain('Supplier One');
    expect(productMaster.text).toContain(',100,250,');

    const webListing = await request(app)
      .get('/api/exports/web-listing.csv')
      .set('Authorization', auth)
      .expect(200);
    expect(webListing.text).toContain('company_product_code,product_name,product_description,jan_code,category_name,product_type,listing_price,image_url,project_title,client_name,adoption_date');
    expect(webListing.text).toContain('CMP-001');
    expect(webListing.text).not.toContain('cost');
    expect(webListing.text).not.toContain('supplier_name');
    expect(webListing.text).not.toContain('total_profit');

    const internalMaster = await request(app)
      .get('/api/exports/internal-master.csv')
      .set('Authorization', auth)
      .expect(200);
    expect(internalMaster.text).toContain('company_product_code,product_id,product_name');
    expect(internalMaster.text).toContain('cost_price,reference_retail_price');
    expect(internalMaster.text).toContain('allow_publish,allow_order');
    expect(internalMaster.text).toContain('CMP-001');

    const orders = await request(app)
      .get('/api/exports/orders.csv')
      .set('Authorization', auth)
      .expect(200);
    expect(orders.text).toContain('order_id,project_title,client_name,product_id,product_name,supplier_name,quantity,delivery_date,delivery_location,status,order_type,created_at,updated_at');
    expect(orders.text).toContain('order-1');
    expect(orders.text).toContain('Supplier One');

    const auditLogs = dependencies.db.auditLog._records as Array<{ action: string; metadata?: { dataset?: string; rowCount?: number } }>;
    expect(auditLogs.some((log) => log.action === 'EXPORT_CSV' && log.metadata?.dataset === 'orders')).toBe(true);
  });

  it('generates, stores, reuses, and lists project proposal and P/L documents', async () => {
    const dependencies = await createTestDependenciesWithPassword('Correct123!');
    const app = createApp(dependencies);
    const auth = await getAuthHeader(app);
    const supplierAuth = await getSupplierAuthHeader(app);
    const storage = dependencies.storage as ReturnType<typeof createFakeStorage>;

    await request(app).post('/api/projects/project-1/documents/proposal-pptx').expect(401);
    await request(app)
      .post('/api/projects/project-1/documents/proposal-pptx')
      .set('Authorization', supplierAuth)
      .expect(403);

    await request(app)
      .post('/api/products/product-seeded/images')
      .set('Authorization', auth)
      .attach('images', await createTestImage(), { filename: 'proposal.png', contentType: 'image/png' })
      .expect(201);

    await request(app)
      .post('/api/products/product-seeded/approve')
      .set('Authorization', auth)
      .expect(200);

    const created = await request(app)
      .post('/api/projects')
      .set('Authorization', auth)
      .send({
        title: 'Document Project',
        clientId: 'client-1',
        status: ProjectStatus.PROPOSED,
        products: [
          {
            productId: 'product-seeded',
            proposalComment: 'Best candidate',
            cost: 100,
            sellingPrice: 250,
            quantity: 3,
            isAdopted: true,
            adoptionDate: '2026-05-01',
            allowPublish: true,
            allowOrder: true,
          },
        ],
      })
      .expect(201);

    const proposal = await request(app)
      .post(`/api/projects/${created.body.project.id}/documents/proposal-pptx`)
      .set('Authorization', auth)
      .send({})
      .expect(201);
    expect(proposal.body.reused).toBe(false);
    expect(proposal.body.document).toMatchObject({
      purpose: 'PROJECT_PROPOSAL_PPTX',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      downloadUrl: 'https://storage.example.test/download',
    });
    const proposalObject = storage.objects.find((object) => object.objectKey.includes('/project_proposal_pptx/'));
    expect(proposalObject?.body.length).toBeGreaterThan(1000);
    expect(proposalObject?.body.includes(Buffer.from('cost'))).toBe(false);
    const proposalZip = new PizZip(proposalObject?.body);
    expect(Object.keys(proposalZip.files).some((file) => file.startsWith('ppt/media/image-product-'))).toBe(true);

    const reused = await request(app)
      .post(`/api/projects/${created.body.project.id}/documents/proposal-pptx`)
      .set('Authorization', auth)
      .send({})
      .expect(200);
    expect(reused.body.reused).toBe(true);
    expect(storage.objects.filter((object) => object.objectKey.includes('/project_proposal_pptx/'))).toHaveLength(1);

    const regenerated = await request(app)
      .post(`/api/projects/${created.body.project.id}/documents/proposal-pptx`)
      .set('Authorization', auth)
      .send({ force: true })
      .expect(201);
    expect(regenerated.body.reused).toBe(false);
    expect(storage.objects.filter((object) => object.objectKey.includes('/project_proposal_pptx/'))).toHaveLength(2);

    const pl = await request(app)
      .post(`/api/projects/${created.body.project.id}/documents/pl-xlsx`)
      .set('Authorization', auth)
      .send({})
      .expect(201);
    expect(pl.body.document).toMatchObject({
      purpose: 'PROJECT_PL_XLSX',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const plObject = storage.objects.find((object) => object.objectKey.includes('/project_pl_xlsx/'));
    const plZip = new PizZip(plObject?.body);
    expect(plZip.file('xl/styles.xml')?.asText()).toContain('Yu Mincho');
    const plSheetXml = plZip.file('xl/worksheets/sheet1.xml')?.asText() ?? '';
    expect(getXlsxCellValue(plSheetXml, 'C9')).toBe('倉庫');
    expect(getXlsxCellValue(plSheetXml, 'F9')).toBe('750');
    expect(getXlsxCellValue(plSheetXml, 'H9')).toBe('300');
    expect(getXlsxCellValue(plSheetXml, 'I9')).toBe('450');
    expect(getXlsxCellValue(plSheetXml, 'N4')).toBe('750');
    expect(getXlsxCellValue(plSheetXml, 'N6')).toBe('450');

    const list = await request(app)
      .get(`/api/projects/${created.body.project.id}/documents`)
      .set('Authorization', auth)
      .expect(200);
    expect(list.body.documents.map((document: { purpose: string }) => document.purpose).sort()).toEqual([
      'PROJECT_PL_XLSX',
      'PROJECT_PROPOSAL_PPTX',
    ]);

    const auditLogs = dependencies.db.auditLog._records as Array<{ action: string; metadata?: { purpose?: string } }>;
    expect(auditLogs.some((log) => log.action === 'DOCUMENT_GENERATE' && log.metadata?.purpose === 'PROJECT_PL_XLSX')).toBe(true);
    expect(auditLogs.some((log) => log.action === 'DOCUMENT_REUSE' && log.metadata?.purpose === 'PROJECT_PROPOSAL_PPTX')).toBe(true);
  });

  it('maps green proposal template gap fields and candidate gallery images', async () => {
    const storage = createFakeStorage();
    const imageBytes = await createTestImage();
    const products = [1, 2, 3].map((productIndex) => ({
      proposalComment: `Proposal comment ${productIndex}`,
      recommendationReasons: [
        { title: `Reason ${productIndex}-1`, detail: `Reason detail ${productIndex}-1` },
        { title: `Reason ${productIndex}-2`, detail: `Reason detail ${productIndex}-2` },
        { title: `Reason ${productIndex}-3`, detail: `Reason detail ${productIndex}-3` },
      ],
      cost: 100,
      sellingPrice: 200 + productIndex,
      quantity: 2,
      displayOrder: productIndex - 1,
      isAdopted: productIndex === 1,
      adoptionDate: new Date('2026-05-01T00:00:00.000Z'),
      orderPlannedDate: new Date('2026-05-10T00:00:00.000Z'),
      product: {
        name: `Green Product ${productIndex}`,
        description: `Green description ${productIndex}`,
        modelNumber: `MODEL-${productIndex}`,
        features: [
          `Feature ${productIndex}-1`,
          `Feature ${productIndex}-2`,
          `Feature ${productIndex}-3`,
        ],
        janCode: `JAN-${productIndex}`,
        productType: ProductType.WAREHOUSE,
        listPrice: 300 + productIndex,
        minLot: 10,
        leadTime: `${productIndex} weeks`,
        images: Array.from({ length: 6 }, (_, imageIndex) => ({
          sortOrder: imageIndex,
          file: {
            objectKey: `products/product-${productIndex}/image-${imageIndex}.jpg`,
            mimeType: 'image/jpeg',
          },
        })),
      },
    }));

    for (const projectProduct of products) {
      for (const image of projectProduct.product.images) {
        await storage.putObject({
          objectKey: image.file.objectKey,
          body: imageBytes,
          contentType: 'image/jpeg',
        });
      }
    }

    const generated = await generateProposalPptx(
      {
        id: 'project-green',
        title: 'Green Template Regression',
        status: ProjectStatus.PROPOSED,
        proposalBackground: 'Background value',
        recommendationPoints: ['Point regression 1', 'Point regression 2', 'Point regression 3'],
        remarks: 'Remarks regression value',
        client: { name: 'Client Regression' },
        totalRevenue: 1200,
        totalProfit: 600,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        products,
        orderRequests: [{ deliveryDate: new Date('2026-06-01T00:00:00.000Z') }],
      } as any,
      'Actor Regression',
      storage,
    );

    const zip = new PizZip(generated);
    const allSlidesXml = getSlideXml(zip).join('\n');
    const slide3Xml = zip.file('ppt/slides/slide3.xml')?.asText() ?? '';
    const slide4Xml = zip.file('ppt/slides/slide4.xml')?.asText() ?? '';
    const slide8Xml = zip.file('ppt/slides/slide8.xml')?.asText() ?? '';
    const slide9Xml = zip.file('ppt/slides/slide9.xml')?.asText() ?? '';

    [
      'Green Template Regression',
      'Client Regression',
      'Actor Regression',
      'Background value',
      'Point regression 1',
      'Point regression 2',
      'Point regression 3',
      'Green Product 1',
      'Green Product 2',
      'Green Product 3',
      'MODEL-1',
      'Feature 1-1',
      'Reason 1-1',
      'Reason detail 1-1',
      '数量',
      '売上',
      '¥402',
      '2026-05-10',
      '2026-06-01',
      'Remarks regression value',
    ].forEach((expectedText) => {
      expect(allSlidesXml).toContain(expectedText);
    });

    expect(Object.keys(zip.files).filter((file) => file.startsWith('ppt/media/image-product-'))).toHaveLength(23);
    expect(zip.file('[Content_Types].xml')?.asText()).toContain('Extension="jpg"');
    expect(allSlidesXml).not.toContain('[ 商品画像 ]');
    expect(allSlidesXml).not.toContain('[ 画像 ]');
    expect(allSlidesXml).not.toContain('[ 採用商品画像 ]');
    expect(allSlidesXml).not.toContain('¥〇〇〇');
    expect(slide3Xml).not.toContain('商品名\n');
    expect(slide3Xml).not.toContain('型番\n');
    expect(slide9Xml).not.toContain('提案日\n');
    expect(slide9Xml).not.toContain('採用決定\n');
    const [slide3Image] = extractPictureExtents(slide3Xml);
    expect(slide3Image).toMatchObject({ x: 678500, y: 2134909, cx: 3850000, cy: 2860000 });
    expect(extractPictureExtents(slide4Xml)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ x: 1135999, y: 1826016, cx: 2300000, cy: 1740000 }),
        expect.objectContaining({ x: 4979800, y: 1805382, cx: 2300000, cy: 1740000 }),
        expect.objectContaining({ x: 8820501, y: 1814411, cx: 2300000, cy: 1740000 }),
      ]),
    );
    expect(extractPictureExtents(slide8Xml)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ x: 1773584, y: 1991141, cx: 2396431, cy: 2875717 }),
      ]),
    );
    await expect(extractImageDimensions(zip.file('ppt/media/image-product-1.jpg')?.asNodeBuffer() ?? Buffer.from([]))).resolves.toMatchObject({
      width: 1600,
      height: 1189,
    });
    expect(zip.file('ppt/slides/slide5.xml')?.asText()).toContain('<p:pic>');
    expect(zip.file('ppt/slides/slide6.xml')?.asText()).toContain('<p:pic>');
    expect(zip.file('ppt/slides/slide7.xml')?.asText()).toContain('<p:pic>');
  });

  it('embeds proposal images from product imageUrl fallback', async () => {
    const storage = createFakeStorage();
    const generated = await generateProposalPptx(
      {
        id: 'project-image-url',
        title: 'Image Url Project',
        status: ProjectStatus.PROPOSED,
        client: { name: 'Client Regression' },
        totalRevenue: 1200,
        totalProfit: 600,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        products: [
          {
            proposalComment: 'Fallback image product',
            cost: 100,
            sellingPrice: 300,
            quantity: 4,
            displayOrder: 0,
            isAdopted: true,
            product: {
              name: 'Fallback Image Product',
              description: 'Fallback image description',
              janCode: 'JAN-FALLBACK',
              productType: ProductType.WAREHOUSE,
              listPrice: 300,
              minLot: 1,
              leadTime: '7 days',
              imageUrl: '/assets/logo-icon.png',
              images: [],
            },
          },
        ],
      } as any,
      'Actor Regression',
      storage,
    );

    const zip = new PizZip(generated);
    expect(Object.keys(zip.files).filter((file) => file.startsWith('ppt/media/image-product-'))).toHaveLength(4);
    await expect(extractImageDimensions(zip.file('ppt/media/image-product-1.jpg')?.asNodeBuffer() ?? Buffer.from([]))).resolves.toMatchObject({
      width: 1600,
    });
  });

  it('rejects P/L document generation when the template row limit is exceeded', async () => {
    const app = createApp(await createTestDependenciesWithPassword('Correct123!'));
    const auth = await getAuthHeader(app);

    const created = await request(app)
      .post('/api/projects')
      .set('Authorization', auth)
      .send({
        title: 'Too Many Products',
        clientId: 'client-1',
        status: ProjectStatus.PROPOSED,
        products: Array.from({ length: 13 }, (_, index) => ({
          productId: 'product-seeded',
          proposalComment: `Row ${index + 1}`,
          cost: 100,
          sellingPrice: 250,
          quantity: 1,
          isAdopted: false,
        })),
      })
      .expect(201);

    await request(app)
      .post(`/api/projects/${created.body.project.id}/documents/pl-xlsx`)
      .set('Authorization', auth)
      .send({})
      .expect(400)
      .expect((response) => {
        expect(response.body.error.code).toBe('PL_TEMPLATE_ROW_LIMIT_EXCEEDED');
      });
  });
});

function createTestDependencies() {
  return {
    config,
    db: createFakeDb(),
    storage: createFakeStorage(),
  };
}

async function createTestDependenciesWithPassword(password: string) {
  return {
    config,
    db: createFakeDb(await bcrypt.hash(password, 4)),
    storage: createFakeStorage(),
  };
}

function createFakeDb(passwordHash = 'unused'): DatabaseClient {
  const now = () => new Date('2026-05-14T00:00:00.000Z');
  const users: any[] = [
    {
      id: 'user-1',
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash,
      role: UserRole.ADMIN,
      supplierId: null,
      deletedAt: null,
    },
    {
      id: 'user-supplier',
      name: 'Supplier User',
      email: 'supplier.user@example.com',
      passwordHash,
      role: UserRole.SUPPLIER,
      supplierId: 'supplier-1',
      deletedAt: null,
    },
    {
      id: 'user-product-manager',
      name: 'Product Manager',
      email: 'product.manager@example.com',
      passwordHash,
      role: UserRole.PRODUCT_MANAGER,
      supplierId: null,
      deletedAt: null,
    },
    {
      id: 'user-sales',
      name: 'Sales User',
      email: 'sales@example.com',
      passwordHash,
      role: UserRole.SALES,
      supplierId: null,
      deletedAt: null,
    },
  ];
  const suppliers: any[] = [
    {
      id: 'supplier-1',
      name: 'Supplier One',
      contactName: 'Owner',
      email: 'supplier@example.com',
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    },
    {
      id: 'supplier-2',
      name: 'Supplier Two',
      contactName: 'Owner Two',
      email: 'supplier-two@example.com',
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    },
  ];
  const clients: any[] = [
    {
      id: 'client-1',
      name: 'Client One',
      contactName: 'Buyer',
      email: 'client@example.com',
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    },
  ];
  const categories: any[] = [];
  const products: any[] = [
    {
      id: 'product-seeded',
      name: 'Seed "Product", 日本語',
      description: 'Seed description\nwith comma, and quote "value"',
      categoryId: 'category-seeded',
      category: { name: 'Seed' },
      janCode: 'seed-jan',
      productType: ProductType.WAREHOUSE,
      cost: 100,
      listPrice: 250,
      minLot: 1,
      leadTime: '7 days',
      supplierId: 'supplier-1',
      supplier: { name: 'Supplier One' },
      status: ProductStatus.ACTIVE,
      imageUrl: null,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
      version: 1,
      versions: [],
      images: [],
      attachments: [],
    },
    {
      id: 'product-other-supplier',
      name: 'Other Supplier Product',
      description: 'Other supplier description',
      categoryId: 'category-seeded',
      category: { name: 'Seed' },
      janCode: 'other-supplier-jan',
      productType: ProductType.WAREHOUSE,
      cost: 80,
      listPrice: 200,
      minLot: 1,
      leadTime: '10 days',
      supplierId: 'supplier-2',
      supplier: { name: 'Supplier Two' },
      status: ProductStatus.ACTIVE,
      imageUrl: null,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
      version: 1,
      versions: [],
      images: [],
      attachments: [],
    },
  ];
  const projects: any[] = [];
  const orderRequests: any[] = [
    {
      id: 'order-1',
      projectId: 'order-project-1',
      project: {
        id: 'order-project-1',
        title: 'Order Project',
        client: clients[0],
      },
      productId: 'product-seeded',
      product: products[0],
      productName: products[0].name,
      supplierId: 'supplier-1',
      supplier: suppliers[0],
      quantity: 5,
      deliveryDate: now(),
      deliveryLocation: 'Tokyo Warehouse',
      status: OrderStatus.REQUESTED,
      orderType: 'NEW',
      createdAt: now(),
      updatedAt: now(),
    },
  ];
  const auditLogs: any[] = [];
  const files: any[] = [];
  const productImages: any[] = [];
  const productChangeRequests: any[] = [];
  const notifications: any[] = [];

  return {
    user: {
      async findMany(args: any = {}) {
        const where = args.where ?? {};
        return users
          .filter((user) => {
            const deletedMatch =
              where.deletedAt?.not === null
                ? user.deletedAt !== null
                : where.deletedAt === null
                  ? user.deletedAt === null
                  : true;
            return (
              deletedMatch &&
              (!where.role || user.role === where.role) &&
              (!where.supplierId || user.supplierId === where.supplierId)
            );
          })
          .map((user) => ({
            ...user,
            supplier: suppliers.find((supplier) => supplier.id === user.supplierId) ?? null,
            createdAt: now(),
            updatedAt: now(),
          }));
      },
      async findUnique(args) {
        const where = getWhere(args);
        const user = users.find((item) => item.email === where.email || item.id === where.id);
        return user
          ? {
              ...user,
              supplier: suppliers.find((supplier) => supplier.id === user.supplierId) ?? null,
              createdAt: now(),
              updatedAt: now(),
            }
          : null;
      },
      async create(args: any) {
        const user: any = {
          id: `user-${users.length + 1}`,
          ...getData(args),
          deletedAt: null,
          createdAt: now(),
          updatedAt: now(),
        };
        users.push(user);
        return {
          ...user,
          supplier: suppliers.find((supplier) => supplier.id === user.supplierId) ?? null,
        };
      },
      async update(args: any) {
        const user = users.find((item) => item.id === getWhere(args).id);
        if (!user) return null;
        Object.assign(user, getData(args));
        return {
          ...user,
          supplier: suppliers.find((supplier) => supplier.id === user.supplierId) ?? null,
          createdAt: now(),
          updatedAt: now(),
        };
      },
    },
    supplier: {
      async findMany(args: any = {}) {
        const where = args.where ?? {};
        return suppliers.filter(
          (supplier) => !supplier.deletedAt && (!where.id || supplier.id === where.id),
        );
      },
      async create(args) {
        const supplier = { id: `supplier-${suppliers.length + 1}`, ...getData(args) };
        suppliers.push(supplier);
        return supplier;
      },
      async update(args) {
        return { id: getWhere(args).id, ...getData(args) };
      },
    },
    client: {
      async findMany() {
        return clients.filter((client) => !client.deletedAt);
      },
      async create(args) {
        const client = { id: `client-${clients.length + 1}`, ...getData(args) };
        clients.push(client);
        return client;
      },
      async update(args) {
        return { id: getWhere(args).id, ...getData(args) };
      },
    },
    category: {
      async upsert(args: any) {
        const name = args.where.name;
        let category = categories.find((item) => item.name === name);
        if (!category) {
          category = { id: `category-${categories.length + 1}`, name, createdAt: now(), updatedAt: now() };
          categories.push(category);
        }
        return category;
      },
    },
    product: {
      async findMany(args: any = {}) {
        const where = args.where ?? {};
        return products
          .filter(
            (product) =>
              !product.deletedAt && (!where.supplierId || product.supplierId === where.supplierId),
          )
          .map((product) => ({
            ...product,
            productChangeRequests: productChangeRequests
              .filter((change) => change.productId === product.id && change.status === ChangeRequestStatus.PENDING)
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .slice(0, 1),
            projectItems: projects.flatMap((project) =>
              project.products
                .filter((projectProduct: any) => projectProduct.productId === product.id && projectProduct.isAdopted)
                .map((projectProduct: any) => ({ ...projectProduct, project })),
            ),
          }));
      },
      async findUnique(args: any) {
        const product = products.find((product) => product.id === args.where.id);
        return product
          ? {
              ...product,
              productChangeRequests: productChangeRequests
                .filter((change) => change.productId === product.id && change.status === ChangeRequestStatus.PENDING)
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 1),
            }
          : null;
      },
      async findFirst(args: any) {
        const where = args.where ?? {};
        return products.find((product) =>
          (!where.id?.not || product.id !== where.id.not) &&
          (!where.janCode || product.janCode === where.janCode)
        ) ?? null;
      },
      async create(args: any) {
        const data = args.data;
        const supplier = suppliers.find((item) => item.id === data.supplierId);
        const category = categories.find((item) => item.id === data.categoryId);
        const product = {
          id: `product-${products.length + 1}`,
          ...data,
          supplier,
          category,
          versions: [
            {
              ...data.versions.create,
              createdAt: now(),
            },
          ],
          images: [],
          attachments: [],
          productChangeRequests: [],
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
        };
        products.push(product);
        return product;
      },
      async update(args: any) {
        const product = products.find((item) => item.id === args.where.id);
        if (!product) return null;
        const data = args.data;
        if (data.versions?.create) {
          product.versions.push({ ...data.versions.create, createdAt: now() });
        }
        Object.assign(product, {
          ...data,
          versions: product.versions,
          updatedAt: now(),
        });
        if (data.categoryId) {
          product.category = categories.find((item) => item.id === data.categoryId);
        }
        if (data.supplierId) {
          product.supplier = suppliers.find((item) => item.id === data.supplierId);
        }
        return {
          ...product,
          productChangeRequests: productChangeRequests
            .filter((change) => change.productId === product.id && change.status === ChangeRequestStatus.PENDING)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 1),
        };
      },
    },
    productChangeRequest: {
      async findFirst(args: any) {
        const where = args.where ?? {};
        return productChangeRequests
          .filter((change) =>
            (!where.productId || change.productId === where.productId) &&
            (!where.status || change.status === where.status)
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
      },
      async create(args: any) {
        const change = {
          id: `product-change-${productChangeRequests.length + 1}`,
          ...getData(args),
          createdAt: now(),
          updatedAt: now(),
          approvedAt: null,
          rejectedAt: null,
        };
        productChangeRequests.push(change);
        return change;
      },
      async update(args: any) {
        const change = productChangeRequests.find((item) => item.id === getWhere(args).id);
        if (!change) return null;
        Object.assign(change, getData(args), { updatedAt: now() });
        return change;
      },
    },
    productImage: {
      async count(args: any) {
        return productImages.filter((image) => image.productId === args.where.productId).length;
      },
      async findMany(args: any) {
        const where = args.where ?? {};
        return productImages
          .filter((image) => {
            const file = files.find((item) => item.id === image.fileId);
            return (
              (!where.productId || image.productId === where.productId) &&
              (!where.file?.status || file?.status === where.file.status) &&
              (where.file?.deletedAt === undefined || file?.deletedAt === where.file.deletedAt)
            );
          })
          .map((image) => ({
            ...image,
            file: files.find((file) => file.id === image.fileId),
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },
      async findUnique(args: any) {
        const image = productImages.find((item) => item.id === args.where.id);
        return image
          ? {
              ...image,
              file: files.find((file) => file.id === image.fileId),
            }
          : null;
      },
      async create(args: any) {
        const image: any = {
          id: `product-image-${productImages.length + 1}`,
          ...getData(args),
          createdAt: now(),
        };
        productImages.push(image);
        const product = products.find((item) => item.id === image.productId);
        if (product) {
          product.images = [
            ...(product.images ?? []),
            {
              ...image,
              file: files.find((file) => file.id === image.fileId),
            },
          ].sort((a, b) => a.sortOrder - b.sortOrder);
        }
        return {
          ...image,
          file: files.find((file) => file.id === image.fileId),
        };
      },
      async update(args: any) {
        const image = productImages.find((item) => item.id === args.where.id);
        Object.assign(image, getData(args));
        return image;
      },
      async delete(args: any) {
        const index = productImages.findIndex((item) => item.id === args.where.id);
        const [image] = productImages.splice(index, 1);
        const product = products.find((item) => item.id === image.productId);
        if (product) {
          product.images = (product.images ?? []).filter((item: any) => item.id !== image.id);
        }
        return image;
      },
    },
    project: {
      async findMany(args: any = {}) {
        const where = args.where ?? {};
        return projects
          .filter((project) => (
            !project.deletedAt &&
            (!where.assignedSalesUserId || project.assignedSalesUserId === where.assignedSalesUserId) &&
            (!where.orderRequests?.some?.supplierId ||
              (project.orderRequests ?? []).some((order: any) => order.supplierId === where.orderRequests.some.supplierId)) &&
            (!where.products?.some?.product?.supplierId ||
              project.products.some((projectProduct: any) => {
                const product = products.find((item) => item.id === projectProduct.productId);
                return product?.supplierId === where.products.some.product.supplierId;
              }))
          ))
          .map((project) => ({
            ...project,
            assignedSalesUser: users.find((user) => user.id === project.assignedSalesUserId) ?? null,
            products: args.include?.products?.where?.product?.supplierId
              ? project.products.filter((projectProduct: any) => {
                  const product = products.find((item) => item.id === projectProduct.productId);
                  const matchesSupplier = product?.supplierId === args.include.products.where.product.supplierId;
                  const matchesAllowOrder = args.include.products.where.allowOrder === undefined ||
                    projectProduct.allowOrder === args.include.products.where.allowOrder;
                  return matchesSupplier && matchesAllowOrder;
                })
              : project.products,
            orderRequests: args.include?.orderRequests?.where?.supplierId
              ? (project.orderRequests ?? []).filter((order: any) => order.supplierId === args.include.orderRequests.where.supplierId)
              : project.orderRequests,
          }));
      },
      async findUnique(args: any) {
        const project = projects.find((item) => item.id === args.where.id);
        return project
          ? {
              ...project,
              client: clients.find((client) => client.id === project.clientId) ?? project.client,
              assignedSalesUser: users.find((user) => user.id === project.assignedSalesUserId) ?? null,
            }
          : null;
      },
      async create(args: any) {
        const data = args.data;
        const client = clients.find((item) => item.id === data.clientId);
        const project = {
          id: `project-${projects.length + 1}`,
          ...data,
          client,
          assignedSalesUser: users.find((user) => user.id === data.assignedSalesUserId) ?? null,
          products: data.products.create.map((product: any) => ({
            ...product,
            projectId: `project-${projects.length + 1}`,
            project: undefined,
            product: products.find((item) => item.id === product.productId),
            createdAt: now(),
            updatedAt: now(),
          })),
          orderRequests: [],
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
        };
        projects.push(project);
        return project;
      },
      async update(args: any) {
        const project = projects.find((item) => item.id === args.where.id);
        if (!project) return null;
        const data = args.data;
        Object.assign(project, {
          ...data,
          products:
            data.products?.create.map((product: any) => ({
              ...product,
              projectId: project.id,
              project: undefined,
              product: products.find((item) => item.id === product.productId),
              createdAt: now(),
              updatedAt: now(),
            })) ?? project.products,
          updatedAt: now(),
        });
        if (data.clientId) {
          project.client = clients.find((item) => item.id === data.clientId);
        }
        project.assignedSalesUser = users.find((user) => user.id === project.assignedSalesUserId) ?? null;
        return project;
      },
    },
    projectProduct: {
      async findMany() {
        return projects.flatMap((project) =>
          project.products
            .filter((projectProduct: any) => {
              const product = products.find((item) => item.id === projectProduct.productId);
              return (
                projectProduct.isAdopted &&
                projectProduct.allowPublish &&
                !project.deletedAt &&
                product &&
                !product.deletedAt &&
                [ProductStatus.ACTIVE, ProductStatus.ADOPTED].includes(product.status)
              );
            })
            .map((projectProduct: any) => ({
              ...projectProduct,
              project,
              product: products.find((item) => item.id === projectProduct.productId),
            })),
        );
      },
      async updateMany(args: any) {
        const where = args.where ?? {};
        let count = 0;
        for (const project of projects) {
          for (const projectProduct of project.products ?? []) {
            if (
              (!where.projectId || projectProduct.projectId === where.projectId) &&
              (!where.productId || projectProduct.productId === where.productId)
            ) {
              Object.assign(projectProduct, getData(args));
              count += 1;
            }
          }
        }
        return { count };
      },
    },
    orderRequest: {
      async findMany(args: any = {}) {
        const where = args.where ?? {};
        return orderRequests.filter((order) =>
          (!where.projectId || order.projectId === where.projectId) &&
          (!where.supplierId || order.supplierId === where.supplierId)
        );
      },
      async findUnique(args: any) {
        return orderRequests.find((order) => order.id === args.where.id) ?? null;
      },
      async create(args: any) {
        const order: any = {
          id: `order-${orderRequests.length + 1}`,
          ...getData(args),
          project: projects.find((project) => project.id === getData(args).projectId),
          product: products.find((product) => product.id === getData(args).productId),
          supplier: suppliers.find((supplier) => supplier.id === getData(args).supplierId),
          createdAt: now(),
          updatedAt: now(),
        };
        orderRequests.push(order);
        const project = projects.find((item) => item.id === order.projectId);
        if (project) {
          project.orderRequests = [...(project.orderRequests ?? []), order];
        }
        return order;
      },
      async update(args: any) {
        const order = orderRequests.find((item) => item.id === args.where.id);
        if (!order) return null;
        Object.assign(order, getData(args), { updatedAt: now() });
        return order;
      },
    },
    notification: {
      async count(args: any = {}) {
        return (await this.findMany(args)).length;
      },
      async findMany(args: any = {}) {
        const where = args.where ?? {};
        return notifications
          .filter((notification) =>
            (!where.userId || notification.userId === where.userId) &&
            (where.readAt === undefined || notification.readAt === where.readAt)
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, args.take ?? notifications.length);
      },
      async findUnique(args: any) {
        return notifications.find((notification) => notification.id === getWhere(args).id) ?? null;
      },
      async create(args: any) {
        const notification = {
          id: `notification-${notifications.length + 1}`,
          readAt: null,
          createdAt: now(),
          ...getData(args),
        };
        notifications.push(notification);
        return notification;
      },
      async update(args: any) {
        const notification = notifications.find((item) => item.id === getWhere(args).id);
        if (!notification) return null;
        Object.assign(notification, getData(args));
        return notification;
      },
    },
    file: {
      async create(args) {
        const file = {
          id: `file-${files.length + 1}`,
          status: 'PENDING',
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
          ...getData(args),
        };
        files.push(file);
        return file;
      },
      async findMany(args: any) {
        const where = args.where ?? {};
        return files
          .filter((file: any) => {
            const purposeIn = where.purpose?.in as string[] | undefined;
            const purposeEquals = typeof where.purpose === 'string' ? where.purpose : undefined;
            return (
              (!where.ownerType || file.ownerType === where.ownerType) &&
              (!where.ownerId || file.ownerId === where.ownerId) &&
              (!where.status || file.status === where.status) &&
              (!purposeEquals || file.purpose === purposeEquals) &&
              (!purposeIn || purposeIn.includes(file.purpose)) &&
              (where.deletedAt === undefined || file.deletedAt === where.deletedAt)
            );
          })
          .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
      },
      async findFirst(args: any) {
        return (await this.findMany(args))[0] ?? null;
      },
      async findUnique(args) {
        const where = getWhere(args);
        return files.find((file) => getRecordId(file) === where.id) ?? null;
      },
      async update(args) {
        const file = files.find((item) => item.id === getWhere(args).id);
        if (file) Object.assign(file, getData(args));
        return file ?? { id: getWhere(args).id, ...getData(args), status: 'READY' };
      },
    },
    auditLog: {
      _records: auditLogs,
      async create(args: any) {
        const auditLog = { id: `audit-${auditLogs.length + 1}`, ...getData(args), createdAt: now() };
        auditLogs.push(auditLog);
        return auditLog;
      },
    },
  };
}

async function getAuthHeader(app: ReturnType<typeof createApp>) {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'Correct123!' })
    .expect(200);
  return `Bearer ${login.body.accessToken}`;
}

async function getSupplierAuthHeader(app: ReturnType<typeof createApp>) {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'supplier.user@example.com', password: 'Correct123!' })
    .expect(200);
  return `Bearer ${login.body.accessToken}`;
}

async function getProductManagerAuthHeader(app: ReturnType<typeof createApp>) {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'product.manager@example.com', password: 'Correct123!' })
    .expect(200);
  return `Bearer ${login.body.accessToken}`;
}

async function getSalesAuthHeader(app: ReturnType<typeof createApp>) {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'sales@example.com', password: 'Correct123!' })
    .expect(200);
  return `Bearer ${login.body.accessToken}`;
}

async function createTestImage() {
  return sharp({
    create: {
      width: 400,
      height: 400,
      channels: 3,
      background: '#3b82f6',
    },
  })
    .png()
    .toBuffer();
}

function getSlideXml(zip: PizZip) {
  return Object.entries(zip.files)
    .filter(([fileName]) => fileName.startsWith('ppt/slides/slide') && fileName.endsWith('.xml'))
    .map(([, file]) => file.asText());
}

function getXlsxCellValue(sheetXml: string, cell: string) {
  const match = sheetXml.match(new RegExp(`<x:c\\b[^>]*\\br="${cell}"[^>]*>([\\s\\S]*?)</x:c>`));
  return match?.[1].match(/<x:v>([\s\S]*?)<\/x:v>/)?.[1] ?? '';
}

function extractPictureExtents(slideXml: string) {
  return [...slideXml.matchAll(/<p:pic>[\s\S]*?<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>[\s\S]*?<\/p:pic>/g)]
    .map((match) => ({
      x: Number(match[1]),
      y: Number(match[2]),
      cx: Number(match[3]),
      cy: Number(match[4]),
    }));
}

async function extractImageDimensions(bytes: Buffer) {
  const metadata = await sharp(bytes).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
  };
}

type FakeStorage = StorageService & {
  objects: Array<{ objectKey: string; body: Buffer; contentType: string }>;
};

function createFakeStorage(): FakeStorage {
  const objects: Array<{ objectKey: string; body: Buffer; contentType: string }> = [];
  return {
    objects,
    async putObject(input) {
      objects.push({
        objectKey: input.objectKey,
        body: Buffer.from(input.body),
        contentType: input.contentType,
      });
    },
    async createUploadUrl() {
      return 'https://storage.example.test/upload';
    },
    async createDownloadUrl() {
      return 'https://storage.example.test/download';
    },
    async assertObjectExists() {},
    async getObject({ objectKey }) {
      return objects.find((object) => object.objectKey === objectKey)?.body ?? Buffer.from([]);
    },
  };
}

function getWhere(args: unknown): Record<string, string> {
  if (typeof args === 'object' && args !== null && 'where' in args) {
    return args.where as Record<string, string>;
  }
  return {};
}

function getData(args: unknown): Record<string, unknown> {
  if (typeof args === 'object' && args !== null && 'data' in args) {
    return args.data as Record<string, unknown>;
  }
  return {};
}

function getRecordId(value: unknown) {
  return typeof value === 'object' && value !== null && 'id' in value ? value.id : undefined;
}
