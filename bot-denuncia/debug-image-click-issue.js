const { PrismaClient } = require('@prisma/client');

async function debugImageClickIssue() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Debugging Image Click Issue - Admin Panel');
    console.log('=' .repeat(50));
    
    // 1. Check scheduled posts (especially 19h post)
    console.log('\n1. Checking scheduled posts...');
    const scheduledPosts = await prisma.denuncia.findMany({
      where: {
        scheduledPublishAt: { not: null }
      },
      select: {
        id: true,
        protocolo: true,
        scheduledPublishAt: true,
        texto: true,
        endereco: true,
        bairro: true,
        status: true,
        createdAt: true,
        imagemUrl: true,
        priority: true,
        publishAttempts: true,
        instagramPostId: true
      },
      orderBy: { scheduledPublishAt: 'asc' }
    });
    
    console.log(`Found ${scheduledPosts.length} scheduled posts:`);
    scheduledPosts.forEach(post => {
      const scheduledTime = new Date(post.scheduledPublishAt);
      const localTime = scheduledTime.toLocaleString('pt-BR', { 
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log(`- ${post.protocolo}: ${localTime} (${post.status})`);
      console.log(`  Text: ${post.texto.substring(0, 50)}...`);
      console.log(`  Location: ${post.endereco}, ${post.bairro}`);
      console.log(`  Image: ${post.imagemUrl ? 'Yes' : 'No'}`);
      console.log(`  Priority: ${post.priority}`);
      
      // Check if this looks like a fake/test post
      const suspiciousWords = ['test', 'teste', 'fake', 'demo', 'exemplo'];
      const isLikelySuspicious = suspiciousWords.some(word => 
        post.texto.toLowerCase().includes(word) || 
        post.endereco.toLowerCase().includes(word)
      );
      
      if (isLikelySuspicious) {
        console.log(`  ⚠️  SUSPICIOUS: This post might be fake/test data`);
      }
      
      console.log('');
    });
    
    // 2. Check recent denuncias for modal testing
    console.log('\n2. Checking recent denuncias...');
    const recentDenuncias = await prisma.denuncia.findMany({
      select: {
        id: true,
        protocolo: true,
        imagemUrl: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`Found ${recentDenuncias.length} recent denuncias:`);
    recentDenuncias.forEach(denuncia => {
      console.log(`- ${denuncia.protocolo}: ${denuncia.imagemUrl ? 'Has Image' : 'No Image'}`);
      console.log(`  Status: ${denuncia.status}`);
      console.log(`  Created: ${denuncia.createdAt.toLocaleString('pt-BR')}`);
      if (denuncia.imagemUrl) {
        console.log(`  Image URL: ${denuncia.imagemUrl}`);
      }
      console.log('');
    });
    
    // 3. Check for any specific issues with the scheduled 19h post
    console.log('\n3. Analyzing 19h scheduled post...');
    const nineteenHPost = scheduledPosts.find(post => {
      const hour = new Date(post.scheduledPublishAt).getHours();
      return hour === 19 || hour === 22; // 22 UTC = 19 Brazil time
    });
    
    if (nineteenHPost) {
      console.log('Found 19h scheduled post:');
      console.log('- Protocol:', nineteenHPost.protocolo);
      console.log('- Text:', nineteenHPost.texto);
      console.log('- Location:', nineteenHPost.endereco, nineteenHPost.bairro);
      console.log('- Status:', nineteenHPost.status);
      console.log('- Created:', nineteenHPost.createdAt.toLocaleString('pt-BR'));
      console.log('- Scheduled for:', new Date(nineteenHPost.scheduledPublishAt).toLocaleString('pt-BR'));
      console.log('- Priority:', nineteenHPost.priority);
      console.log('- Publish attempts:', nineteenHPost.publishAttempts);
      console.log('- Instagram post ID:', nineteenHPost.instagramPostId || 'None');
      
      // Check if this looks legitimate
      const textLength = nineteenHPost.texto.length;
      const hasRealLocation = !['test', 'teste', 'fake', 'demo'].some(word => 
        nineteenHPost.endereco.toLowerCase().includes(word) ||
        nineteenHPost.bairro.toLowerCase().includes(word)
      );
      const hasRealContent = textLength > 20 && !['test', 'teste', 'fake', 'demo'].some(word => 
        nineteenHPost.texto.toLowerCase().includes(word)
      );
      
      console.log('\nLegitimacy Analysis:');
      console.log('- Text length:', textLength, textLength > 20 ? '✅' : '❌');
      console.log('- Real location:', hasRealLocation ? '✅' : '❌');
      console.log('- Real content:', hasRealContent ? '✅' : '❌');
      console.log('- Overall legitimacy:', (hasRealLocation && hasRealContent) ? '✅ LEGITIMATE' : '❌ SUSPICIOUS');
    } else {
      console.log('No 19h scheduled post found');
    }
    
    // 4. Recommendations
    console.log('\n4. Recommendations:');
    console.log('');
    
    console.log('📊 Database Analysis:');
    if (scheduledPosts.length === 0) {
      console.log('- No scheduled posts found - system is clean ✅');
    } else {
      console.log(`- Found ${scheduledPosts.length} scheduled post(s)`);
      const legitimatePosts = scheduledPosts.filter(post => {
        const suspiciousWords = ['test', 'teste', 'fake', 'demo', 'exemplo'];
        return !suspiciousWords.some(word => 
          post.texto.toLowerCase().includes(word) || 
          post.endereco.toLowerCase().includes(word)
        );
      });
      console.log(`- ${legitimatePosts.length} appear legitimate`);
      console.log(`- ${scheduledPosts.length - legitimatePosts.length} appear suspicious/test data`);
    }
    
    console.log('\n🖱️ Image Click Issue Analysis:');
    console.log('Based on the React component code analysis:');
    console.log('1. Multiple event handlers are competing (row click vs image click)');
    console.log('2. Event propagation may not be properly stopped');
    console.log('3. React state updates might be batched causing delays');
    console.log('4. Possible CSS z-index or pointer-events conflicts');
    
    console.log('\n🔧 Recommended Fixes:');
    console.log('1. Remove event.stopPropagation() from table row clicks');
    console.log('2. Add immediate state updates with useLayoutEffect');
    console.log('3. Ensure image thumbnails have higher z-index');
    console.log('4. Add debouncing to prevent multiple rapid clicks');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug analysis
debugImageClickIssue().catch(console.error);