import { callLLM } from './llm-client';
import { GraphQLClient } from 'graphql-request';

export const executeStep = async (stepType: string, config: any, previousOutput: any, hasuraClient: GraphQLClient): Promise<any> => {
  const prevOutString = typeof previousOutput === 'string' ? previousOutput : JSON.stringify(previousOutput || {});
  
  const replaceTemplates = (text: string) => {
    if (!text) return text;
    return text.replace(/{{previous_output}}/g, prevOutString);
  };

  switch (stepType) {
    case 'llm_call': {
      const prompt = replaceTemplates(config.prompt || '');
      return await callLLM(prompt, config);
    }
    
    case 'http_request': {
      const url = replaceTemplates(config.url || '');
      const method = config.method || 'GET';
      const headers = config.headers || {};
      const bodyStr = config.body ? replaceTemplates(config.body) : undefined;
      
      let attempts = 0;
      while (attempts < 2) {
        try {
          const fetch = (await import('node-fetch')).default;
          const res = await fetch(url, {
            method,
            headers,
            body: bodyStr,
          });
          const resBody = await res.text();
          return { status: res.status, body: resBody, headers: res.headers.raw() };
        } catch (error) {
          attempts++;
          if (attempts >= 2) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      break;
    }
    
    case 'db_write': {
      const tableName = config.table_name;
      let dataStr = JSON.stringify(config.data || {});
      dataStr = replaceTemplates(dataStr);
      const data = JSON.parse(dataStr);
      
      const q = `
        mutation InsertData($data: [${tableName}_insert_input!]!) {
          insert_${tableName}(objects: $data) {
            affected_rows
          }
        }
      `;
      await hasuraClient.request(q, { data: [data] });
      return { inserted: true, table: tableName };
    }
    
    case 'notify': {
      const message = replaceTemplates(config.message || '');
      const channel = config.channel || 'console';
      
      if (channel === 'console') {
        console.log(`NOTIFICATION: ${message}`);
        return { notified: true, channel: 'console' };
      } else if (channel === 'webhook' && config.webhook_url) {
        const fetch = (await import('node-fetch')).default;
        const res = await fetch(config.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message }),
        });
        return { notified: true, channel: 'webhook', status: res.status };
      }
      return { notified: false, error: 'Invalid channel or missing webhook url' };
    }
    
    case 'conditional_branch': {
      const condition = config.condition || 'false';
      let evalResult = false;
      try {
        const check = new Function('previous_output', `return ${condition}`);
        evalResult = check(previousOutput);
      } catch (err) {
        console.error('Condition evaluation failed', err);
        evalResult = false;
      }
      
      const skipTo = evalResult ? config.then_step_order : config.else_step_order;
      return { 
        branch_taken: evalResult ? 'then' : 'else', 
        condition_result: evalResult, 
        skip_to: skipTo 
      };
    }
    
    case 'approval_gate': {
      return { requires_approval: true };
    }
    
    default:
      throw new Error(`Unknown step type: ${stepType}`);
  }
};
